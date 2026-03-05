"""Modul 9: Real-Time Optimization Engine service."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AdMetric
from app.models.campaign import Ad, AdSet, ABTest, Campaign
from app.models.optimization import OptimizationLog, OptimizationRule

logger = logging.getLogger(__name__)


class OptimizationEngineService:
    def __init__(self, claude_client, meta_client):
        self.claude_client = claude_client
        self.meta_client = meta_client

    async def run_optimization_cycle(self, db: AsyncSession) -> list[dict]:
        """Run all 5 optimization rules across active campaigns."""
        actions_taken = []

        active_campaigns = (
            await db.execute(select(Campaign).where(Campaign.status == "active"))
        ).scalars().all()

        for campaign in active_campaigns:
            actions = await self._optimize_campaign(db, campaign)
            actions_taken.extend(actions)

        logger.info(f"Optimization cycle complete: {len(actions_taken)} actions taken")
        return actions_taken

    async def _optimize_campaign(self, db: AsyncSession, campaign: Campaign) -> list[dict]:
        """Apply all optimization rules to a single campaign."""
        actions = []

        ad_sets = (
            await db.execute(select(AdSet).where(AdSet.campaign_id == campaign.id))
        ).scalars().all()

        for ad_set in ad_sets:
            ads = (
                await db.execute(select(Ad).where(Ad.ad_set_id == ad_set.id, Ad.status == "active"))
            ).scalars().all()

            if len(ads) < 2:
                continue

            # Rule 1: A/B Winner Detection
            winner_action = await self._check_ab_winner(db, campaign, ads)
            if winner_action:
                actions.append(winner_action)

            # Rule 2-5 for individual ads
            for ad in ads:
                metrics = await self._get_recent_metrics(db, ad.id, days=2)
                if not metrics:
                    continue

                avg_ctr = sum(m.ctr for m in metrics) / len(metrics)
                avg_roas = sum(m.roas for m in metrics) / len(metrics)
                avg_frequency = sum(m.frequency for m in metrics) / len(metrics)

                # Rule 2: Low CTR
                if avg_ctr < 1.5 and len(metrics) >= 2:
                    action = await self._pause_low_ctr(db, campaign, ad, avg_ctr)
                    actions.append(action)

                # Rule 3: High ROAS Scaling
                elif avg_roas > 4.0:
                    action = await self._scale_high_roas(db, campaign, ad_set, avg_roas)
                    actions.append(action)

                # Rule 5: Ad Fatigue
                if avg_frequency > 4.0:
                    action = await self._refresh_creative(db, campaign, ad, avg_frequency)
                    actions.append(action)

        return actions

    async def _check_ab_winner(self, db: AsyncSession, campaign: Campaign, ads: list[Ad]) -> dict | None:
        """Rule 1: Check if one A/B variant clearly wins."""
        ad_ctrs = {}
        for ad in ads:
            metrics = await self._get_recent_metrics(db, ad.id, days=2)
            if metrics:
                ad_ctrs[ad.id] = sum(m.ctr for m in metrics) / len(metrics)

        if len(ad_ctrs) < 2:
            return None

        best_id = max(ad_ctrs, key=ad_ctrs.get)
        best_ctr = ad_ctrs[best_id]

        for ad_id, ctr in ad_ctrs.items():
            if ad_id != best_id and ctr > 0:
                improvement = ((best_ctr - ctr) / ctr) * 100
                if improvement > 30:
                    # Winner found
                    log = OptimizationLog(
                        campaign_id=campaign.id,
                        ad_id=best_id,
                        action="ab_winner",
                        reason=f"Variant CTR {best_ctr:.2f}% is {improvement:.0f}% higher than others",
                        old_value=f"All variants active",
                        new_value=f"Winner: {best_ctr:.2f}% CTR",
                    )
                    db.add(log)
                    return {"action": "ab_winner", "campaign": str(campaign.id), "winner": str(best_id)}

        return None

    async def _pause_low_ctr(self, db: AsyncSession, campaign: Campaign, ad: Ad, ctr: float) -> dict:
        """Rule 2: Pause ad with CTR < 1.5% for 2 consecutive days."""
        ad.status = "paused"
        log = OptimizationLog(
            campaign_id=campaign.id,
            ad_id=ad.id,
            action="pause_low_ctr",
            reason=f"CTR {ctr:.2f}% below 1.5% threshold for 2 days",
            old_value="active",
            new_value="paused",
        )
        db.add(log)
        return {"action": "pause_low_ctr", "ad": str(ad.id), "ctr": ctr}

    async def _scale_high_roas(self, db: AsyncSession, campaign: Campaign, ad_set: AdSet, roas: float) -> dict:
        """Rule 3: Scale budget 25% for ROAS > 4x."""
        old_budget = ad_set.budget
        new_budget = min(old_budget * 1.25, campaign.max_budget / 3)
        ad_set.budget = new_budget

        log = OptimizationLog(
            campaign_id=campaign.id,
            action="scale_budget",
            reason=f"ROAS {roas:.1f}x exceeds 4x threshold",
            old_value=f"€{old_budget:.2f}",
            new_value=f"€{new_budget:.2f}",
        )
        db.add(log)
        return {"action": "scale_budget", "old": old_budget, "new": new_budget, "roas": roas}

    async def _refresh_creative(self, db: AsyncSession, campaign: Campaign, ad: Ad, frequency: float) -> dict:
        """Rule 5: Refresh creative when frequency > 4."""
        new_copy = await self.claude_client.generate_ab_variants(ad.headline, 1)
        if new_copy:
            ad.headline = new_copy[0].get("headline", ad.headline)
            ad.description = new_copy[0].get("description", ad.description)

        log = OptimizationLog(
            campaign_id=campaign.id,
            ad_id=ad.id,
            action="refresh_creative",
            reason=f"Frequency {frequency:.1f} exceeds 4x threshold (ad fatigue)",
            old_value=ad.headline[:50],
            new_value=new_copy[0].get("headline", "")[:50] if new_copy else "",
        )
        db.add(log)
        return {"action": "refresh_creative", "ad": str(ad.id), "frequency": frequency}

    async def _get_recent_metrics(self, db: AsyncSession, ad_id, days: int = 2) -> list:
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await db.execute(
            select(AdMetric)
            .where(AdMetric.ad_id == ad_id, AdMetric.timestamp >= cutoff)
            .order_by(AdMetric.timestamp.desc())
        )
        return result.scalars().all()
