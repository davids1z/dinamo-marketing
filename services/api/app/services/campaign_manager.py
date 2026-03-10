"""Modul 8: Campaign Manager & A/B Testing service."""

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import ABTest, Ad, AdSet, Campaign

logger = logging.getLogger(__name__)


class CampaignManagerService:
    def __init__(self, meta_client, tiktok_client, claude_client, content_creator=None):
        self.meta_client = meta_client
        self.tiktok_client = tiktok_client
        self.claude_client = claude_client
        self.content_creator = content_creator

    async def create_campaign(self, db: AsyncSession, data: dict) -> dict:
        """Create a campaign with A/B test variants and auto-generated visuals."""
        campaign = Campaign(
            name=data["name"],
            platform=data["platform"],
            market_id=data.get("market_id"),
            objective=data.get("objective", "awareness"),
            status="draft",
            daily_budget=data.get("daily_budget", 50.0),
            max_budget=data.get("max_budget", 1500.0),
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
        )
        db.add(campaign)
        await db.flush()

        # Create ad set
        ad_set = AdSet(
            campaign_id=campaign.id,
            name=f"{data['name']} - AdSet 1",
            targeting=data.get("targeting", {}),
            placement=data.get("placement", "automatic"),
            status="active",
            budget=data.get("daily_budget", 50.0),
            audience_size=data.get("audience_size", 500000),
        )
        db.add(ad_set)
        await db.flush()

        # Generate 3 A/B variants via Claude
        base_copy = data.get("base_copy", data["name"])
        variants = await self.claude_client.generate_ab_variants(base_copy, 3)

        # Determine target platform for visuals
        platform = data.get("platform", "meta")
        visual_platform = "instagram" if platform == "meta" else platform

        ads = []
        for idx, variant in enumerate(variants):
            label = chr(65 + idx)  # A, B, C
            image_url = variant.get("image_url", "")

            # Auto-generate visual if content_creator is available
            if self.content_creator and not image_url:
                try:
                    creative = await self.content_creator.generate_ad_creative(
                        campaign={"name": data["name"], "objective": data.get("objective", "awareness"), "id": str(campaign.id)},
                        variant={"headline": variant.get("headline", ""), "description": variant.get("description", ""), "cta": variant.get("cta", ""), "variant_label": label},
                        platform=visual_platform,
                    )
                    image_url = creative.get("visual_url", "")
                    logger.info("Generated visual for variant %s: %s", label, image_url)
                except Exception as e:
                    logger.warning("Failed to generate visual for variant %s: %s", label, e)

            ad = Ad(
                ad_set_id=ad_set.id,
                variant_label=label,
                headline=variant.get("headline", f"Variant {label}"),
                description=variant.get("description", ""),
                cta=variant.get("cta", "Learn More"),
                image_url=image_url,
                status="active",
            )
            db.add(ad)
            ads.append(ad)

        await db.flush()

        # Create A/B test
        ab_test = ABTest(
            campaign_id=campaign.id,
            status="running",
        )
        db.add(ab_test)
        await db.flush()

        logger.info("Created campaign '%s' with %d A/B variants", data["name"], len(ads))

        return {
            "campaign_id": str(campaign.id),
            "ad_set_id": str(ad_set.id),
            "ads": [
                {"id": str(a.id), "variant": a.variant_label, "headline": a.headline, "image_url": a.image_url}
                for a in ads
            ],
            "ab_test_id": str(ab_test.id),
        }

    async def pause_campaign(self, db: AsyncSession, campaign_id: UUID) -> dict:
        campaign = await db.get(Campaign, campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        campaign.status = "paused"
        await db.flush()

        # Pause on platform
        if campaign.platform == "meta":
            await self.meta_client.pause_ad(str(campaign_id))

        return {"campaign_id": str(campaign_id), "status": "paused"}

    async def resume_campaign(self, db: AsyncSession, campaign_id: UUID) -> dict:
        campaign = await db.get(Campaign, campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        campaign.status = "active"
        await db.flush()
        return {"campaign_id": str(campaign_id), "status": "active"}

    async def get_ab_test_results(self, db: AsyncSession, campaign_id: UUID) -> dict:
        """Get A/B test results for a campaign."""
        result = await db.execute(
            select(ABTest).where(ABTest.campaign_id == campaign_id)
        )
        ab_test = result.scalar_one_or_none()
        if not ab_test:
            return {"status": "no_test"}

        # Get all ads for this campaign
        ads_result = await db.execute(
            select(Ad)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .where(AdSet.campaign_id == campaign_id)
        )
        ads = ads_result.scalars().all()

        return {
            "ab_test_id": str(ab_test.id),
            "status": ab_test.status,
            "winner_ad_id": str(ab_test.winner_ad_id) if ab_test.winner_ad_id else None,
            "confidence": ab_test.confidence_pct,
            "decision_reason": ab_test.decision_reason,
            "variants": [
                {
                    "id": str(ad.id),
                    "label": ad.variant_label,
                    "headline": ad.headline,
                    "status": ad.status,
                }
                for ad in ads
            ],
        }

    async def refresh_creative(self, db: AsyncSession, campaign_id: UUID) -> dict:
        """Refresh ad creatives for a campaign (generate new variants + visuals)."""
        campaign = await db.get(Campaign, campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        # Get existing ads
        ads_result = await db.execute(
            select(Ad)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .where(AdSet.campaign_id == campaign_id)
        )
        existing_ads = ads_result.scalars().all()

        # Generate new variants via Claude
        base_copy = campaign.name
        new_variants = await self.claude_client.generate_ab_variants(base_copy, len(existing_ads))

        visual_platform = "instagram" if campaign.platform == "meta" else campaign.platform

        refreshed = []
        for ad, variant in zip(existing_ads, new_variants):
            ad.headline = variant.get("headline", ad.headline)
            ad.description = variant.get("description", ad.description)
            ad.cta = variant.get("cta", ad.cta)

            # Regenerate visual
            if self.content_creator:
                try:
                    creative = await self.content_creator.generate_ad_creative(
                        campaign=campaign,
                        variant={"headline": ad.headline, "description": ad.description, "cta": ad.cta, "variant_label": ad.variant_label},
                        platform=visual_platform,
                    )
                    ad.image_url = creative.get("visual_url", ad.image_url)
                except Exception as e:
                    logger.warning("Failed to regenerate visual for ad %s: %s", ad.id, e)

            refreshed.append({
                "id": str(ad.id),
                "variant": ad.variant_label,
                "new_headline": ad.headline,
                "image_url": ad.image_url,
            })

        await db.flush()
        logger.info("Refreshed %d creatives for campaign %s", len(refreshed), campaign_id)

        return {
            "campaign_id": str(campaign_id),
            "refreshed_ads": refreshed,
            "reason": "creative_fatigue_prevention",
        }

    async def get_campaign_performance(self, db: AsyncSession, campaign_id: UUID) -> dict:
        """Get detailed performance data for a campaign with ad-level metrics."""
        from app.models.analytics import AdMetric

        campaign = await db.get(Campaign, campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        # Get all ads for this campaign
        ads_result = await db.execute(
            select(Ad)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .where(AdSet.campaign_id == campaign_id)
        )
        ads = ads_result.scalars().all()

        ad_performance = []
        for ad in ads:
            metrics_result = await db.execute(
                select(AdMetric)
                .where(AdMetric.ad_id == ad.id)
                .order_by(AdMetric.timestamp.desc())
                .limit(30)
            )
            metrics = metrics_result.scalars().all()

            total_impressions = sum(m.impressions for m in metrics)
            total_clicks = sum(m.clicks for m in metrics)
            total_spend = sum(m.spend for m in metrics)
            total_conversions = sum(m.conversions for m in metrics)
            ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
            roas = (total_conversions * 10 / total_spend) if total_spend > 0 else 0

            ad_performance.append({
                "ad_id": str(ad.id),
                "variant_label": ad.variant_label,
                "headline": ad.headline,
                "description": ad.description,
                "image_url": ad.image_url,
                "status": ad.status,
                "impressions": total_impressions,
                "clicks": total_clicks,
                "ctr": round(ctr, 2),
                "spend": round(total_spend, 2),
                "conversions": total_conversions,
                "roas": round(roas, 2),
                "daily_metrics": [
                    {
                        "date": m.timestamp.strftime("%Y-%m-%d") if m.timestamp else "",
                        "impressions": m.impressions,
                        "clicks": m.clicks,
                        "spend": round(m.spend, 2),
                        "conversions": m.conversions,
                    }
                    for m in reversed(metrics[:7])
                ],
            })

        return {
            "campaign_id": str(campaign_id),
            "name": campaign.name,
            "platform": campaign.platform,
            "objective": campaign.objective,
            "status": campaign.status,
            "daily_budget": campaign.daily_budget,
            "max_budget": campaign.max_budget,
            "total_spend": campaign.total_spend,
            "ads": ad_performance,
        }
