"""Modul 8: Campaign Manager & A/B Testing service."""

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import ABTest, Ad, AdSet, Campaign

logger = logging.getLogger(__name__)


class CampaignManagerService:
    def __init__(self, meta_client, tiktok_client, claude_client):
        self.meta_client = meta_client
        self.tiktok_client = tiktok_client
        self.claude_client = claude_client

    async def create_campaign(self, db: AsyncSession, data: dict) -> dict:
        """Create a campaign with A/B test variants."""
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

        ads = []
        for idx, variant in enumerate(variants):
            label = chr(65 + idx)  # A, B, C
            ad = Ad(
                ad_set_id=ad_set.id,
                variant_label=label,
                headline=variant.get("headline", f"Variant {label}"),
                description=variant.get("description", ""),
                cta=variant.get("cta", "Learn More"),
                image_url=variant.get("image_url", ""),
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

        logger.info(f"Created campaign '{data['name']}' with {len(ads)} A/B variants")

        return {
            "campaign_id": str(campaign.id),
            "ad_set_id": str(ad_set.id),
            "ads": [{"id": str(a.id), "variant": a.variant_label} for a in ads],
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
        """Refresh ad creatives for a campaign (generate new variants)."""
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

        refreshed = []
        for ad, variant in zip(existing_ads, new_variants):
            ad.headline = variant.get("headline", ad.headline)
            ad.description = variant.get("description", ad.description)
            ad.cta = variant.get("cta", ad.cta)
            refreshed.append({"id": str(ad.id), "variant": ad.variant_label, "new_headline": ad.headline})

        await db.flush()
        logger.info(f"Refreshed {len(refreshed)} creatives for campaign {campaign_id}")

        return {
            "campaign_id": str(campaign_id),
            "refreshed_ads": refreshed,
            "reason": "creative_fatigue_prevention",
        }
