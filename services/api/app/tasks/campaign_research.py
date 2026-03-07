import asyncio
import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="tasks.run_campaign_research",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def run_campaign_research(self, campaign_id: str):
    """Background task: analyze brief -> research -> generate plan."""
    from app.database import SyncSessionLocal
    from app.dependencies import get_web_research_client
    from app.models.campaign_research import CampaignResearch, CampaignResearchStatus
    from app.services.campaign_research import CampaignResearchService

    logger.info("Starting campaign research for %s", campaign_id)
    db = SyncSessionLocal()

    try:
        # Load campaign
        campaign = db.query(CampaignResearch).filter_by(id=campaign_id).first()
        if not campaign:
            logger.error("Campaign %s not found", campaign_id)
            return {"error": "Campaign not found"}

        service = CampaignResearchService(get_web_research_client())
        loop = asyncio.new_event_loop()

        try:
            # Phase 1: Analyze brief
            campaign.status = CampaignResearchStatus.ANALYZING.value
            db.commit()
            logger.info("[%s] Phase 1: Analyzing brief...", campaign_id)

            brief = loop.run_until_complete(
                service.extract_brief(campaign.uploaded_text or "")
            )
            campaign.extracted_brief = brief
            db.commit()

            # Phase 2: Web research
            campaign.status = CampaignResearchStatus.RESEARCHING.value
            db.commit()
            logger.info("[%s] Phase 2: Researching...", campaign_id)

            research = loop.run_until_complete(service.research_campaign(brief))
            campaign.research_data = research
            db.commit()

            # Phase 3: Generate plan
            campaign.status = CampaignResearchStatus.GENERATING.value
            db.commit()
            logger.info("[%s] Phase 3: Generating plan...", campaign_id)

            plan = loop.run_until_complete(service.generate_plan(brief, research))
            campaign.generated_plan = plan
            campaign.title = brief.get("title", campaign.title)
            campaign.campaign_type = brief.get("campaign_type", "other")
            campaign.status = CampaignResearchStatus.COMPLETE.value
            db.commit()

            logger.info("[%s] Campaign research complete!", campaign_id)
            return {"campaign_id": campaign_id, "status": "complete"}

        finally:
            loop.close()

    except Exception as exc:
        logger.exception("Campaign research failed for %s: %s", campaign_id, exc)
        try:
            campaign = db.query(CampaignResearch).filter_by(id=campaign_id).first()
            if campaign:
                campaign.status = CampaignResearchStatus.FAILED.value
                campaign.error_message = str(exc)[:1000]
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)

    finally:
        db.close()
