"""Modul 2: Channel Audit Engine service."""

import logging
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import ChannelHealthScore, ChannelMetric, SocialChannel

logger = logging.getLogger(__name__)

# Benchmark thresholds for health scoring
ENGAGEMENT_BENCHMARKS = {
    "instagram": 2.5,
    "facebook": 0.8,
    "tiktok": 5.0,
    "youtube": 3.0,
    "twitter": 0.5,
}

GROWTH_BENCHMARKS = {
    "instagram": 1.5,
    "facebook": 0.5,
    "tiktok": 3.0,
    "youtube": 2.0,
    "twitter": 0.8,
}


class ChannelAuditService:
    def __init__(self, meta_client, tiktok_client, youtube_client, ga4_client):
        self.meta_client = meta_client
        self.tiktok_client = tiktok_client
        self.youtube_client = youtube_client
        self.ga4_client = ga4_client

    async def run_full_audit(self, db: AsyncSession) -> dict:
        """Audit all own brand channels across platforms."""
        result = await db.execute(
            select(SocialChannel).where(SocialChannel.owner_type == "own")
        )
        channels = result.scalars().all()

        if not channels:
            logger.warning("No own brand channels found in database")
            return {
                "status": "no_channels",
                "channels_audited": 0,
                "audit_date": date.today().isoformat(),
            }

        audit_results = []
        for channel in channels:
            channel_result = await self._audit_single_channel(db, channel)
            audit_results.append(channel_result)

        # Calculate aggregate scores
        avg_overall = sum(r["overall_score"] for r in audit_results) / len(audit_results)
        platforms_covered = list({r["platform"] for r in audit_results})

        logger.info(
            f"Full audit completed: {len(audit_results)} channels, "
            f"avg health score {avg_overall:.1f}"
        )

        return {
            "status": "completed",
            "audit_date": date.today().isoformat(),
            "channels_audited": len(audit_results),
            "avg_overall_score": round(avg_overall, 1),
            "platforms_covered": platforms_covered,
            "results": audit_results,
        }

    async def audit_channel(self, db: AsyncSession, channel_id: UUID) -> dict:
        """Audit a single channel by ID."""
        channel = await db.get(SocialChannel, channel_id)
        if not channel:
            raise ValueError(f"Channel {channel_id} not found")

        return await self._audit_single_channel(db, channel)

    async def _audit_single_channel(self, db: AsyncSession, channel: SocialChannel) -> dict:
        """Internal method: run audit for a single channel and persist health score."""
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        # Fetch latest metrics for last 30 days
        result = await db.execute(
            select(ChannelMetric)
            .where(
                ChannelMetric.channel_id == channel.id,
                ChannelMetric.date >= thirty_days_ago,
            )
            .order_by(ChannelMetric.date.desc())
        )
        metrics = result.scalars().all()

        if not metrics:
            # Fallback: pull from platform API
            platform_data = await self._fetch_platform_metrics(channel)
            growth_score = platform_data.get("growth_score", 50.0)
            engagement_score = platform_data.get("engagement_score", 50.0)
            content_quality_score = platform_data.get("content_quality_score", 50.0)
            audience_quality_score = platform_data.get("audience_quality_score", 50.0)
            current_followers = platform_data.get("followers", 0)
            avg_engagement_rate = platform_data.get("engagement_rate", 0.0)
        else:
            latest = metrics[0]
            oldest = metrics[-1]
            current_followers = latest.followers

            # Growth score: follower growth rate over 30 days
            if oldest.followers > 0:
                growth_pct = ((latest.followers - oldest.followers) / oldest.followers) * 100
            else:
                growth_pct = 0.0
            benchmark = GROWTH_BENCHMARKS.get(channel.platform, 1.0)
            growth_score = min((growth_pct / benchmark) * 50 + 50, 100)

            # Engagement score
            avg_engagement_rate = sum(m.engagement_rate for m in metrics) / len(metrics)
            eng_benchmark = ENGAGEMENT_BENCHMARKS.get(channel.platform, 1.0)
            engagement_score = min((avg_engagement_rate / eng_benchmark) * 50 + 50, 100)

            # Content quality score: based on posting frequency consistency
            avg_frequency = sum(m.posting_frequency for m in metrics) / len(metrics)
            ideal_frequency = 5.0  # posts per week
            freq_ratio = min(avg_frequency / ideal_frequency, 1.5)
            content_quality_score = min(freq_ratio * 66.7, 100)

            # Audience quality score: based on reach-to-follower ratio
            if current_followers > 0:
                avg_reach = sum(m.avg_reach for m in metrics) / len(metrics)
                reach_ratio = avg_reach / current_followers
                audience_quality_score = min(reach_ratio * 200, 100)
            else:
                audience_quality_score = 0.0

        # Overall weighted score
        overall = (
            growth_score * 0.25
            + engagement_score * 0.30
            + content_quality_score * 0.25
            + audience_quality_score * 0.20
        )

        # Persist health score
        health_score = ChannelHealthScore(
            channel_id=channel.id,
            date=today,
            growth_score=round(growth_score, 1),
            engagement_score=round(engagement_score, 1),
            content_quality_score=round(content_quality_score, 1),
            audience_quality_score=round(audience_quality_score, 1),
            overall_score=round(overall, 1),
        )
        db.add(health_score)
        await db.flush()

        logger.info(
            f"Audited {channel.platform}/@{channel.handle}: overall={overall:.1f}"
        )

        return {
            "channel_id": str(channel.id),
            "platform": channel.platform,
            "handle": channel.handle,
            "followers": current_followers if metrics else 0,
            "avg_engagement_rate": round(avg_engagement_rate, 2) if metrics else 0.0,
            "growth_score": round(growth_score, 1),
            "engagement_score": round(engagement_score, 1),
            "content_quality_score": round(content_quality_score, 1),
            "audience_quality_score": round(audience_quality_score, 1),
            "overall_score": round(overall, 1),
            "audit_date": today.isoformat(),
        }

    async def _fetch_platform_metrics(self, channel: SocialChannel) -> dict:
        """Fetch live metrics from the appropriate platform API."""
        try:
            if channel.platform == "instagram":
                data = await self.meta_client.get_account_insights(channel.handle)
            elif channel.platform == "facebook":
                data = await self.meta_client.get_page_insights(channel.handle)
            elif channel.platform == "tiktok":
                data = await self.tiktok_client.get_account_stats(channel.handle)
            elif channel.platform == "youtube":
                data = await self.youtube_client.get_channel_stats(channel.handle)
            else:
                data = {}
            return data
        except Exception as exc:
            logger.error(f"Failed to fetch metrics for {channel.platform}/{channel.handle}: {exc}")
            return {
                "growth_score": 50.0,
                "engagement_score": 50.0,
                "content_quality_score": 50.0,
                "audience_quality_score": 50.0,
                "followers": 0,
                "engagement_rate": 0.0,
            }

    async def get_health_scores(self, db: AsyncSession) -> list[dict]:
        """Get the latest health scores for all own brand channels."""
        # Subquery: latest date per channel
        latest_date_subq = (
            select(
                ChannelHealthScore.channel_id,
                func.max(ChannelHealthScore.date).label("max_date"),
            )
            .group_by(ChannelHealthScore.channel_id)
            .subquery()
        )

        result = await db.execute(
            select(ChannelHealthScore, SocialChannel)
            .join(SocialChannel, ChannelHealthScore.channel_id == SocialChannel.id)
            .join(
                latest_date_subq,
                (ChannelHealthScore.channel_id == latest_date_subq.c.channel_id)
                & (ChannelHealthScore.date == latest_date_subq.c.max_date),
            )
            .where(SocialChannel.owner_type == "own")
            .order_by(ChannelHealthScore.overall_score.desc())
        )
        rows = result.all()

        if not rows:
            logger.info("No health scores found; returning defaults")
            return [
                {
                    "platform": "instagram",
                    "handle": "@demo_brand",
                    "overall_score": 0.0,
                    "growth_score": 0.0,
                    "engagement_score": 0.0,
                    "content_quality_score": 0.0,
                    "audience_quality_score": 0.0,
                    "date": date.today().isoformat(),
                }
            ]

        return [
            {
                "channel_id": str(score.channel_id),
                "platform": channel.platform,
                "handle": channel.handle,
                "overall_score": score.overall_score,
                "growth_score": score.growth_score,
                "engagement_score": score.engagement_score,
                "content_quality_score": score.content_quality_score,
                "audience_quality_score": score.audience_quality_score,
                "date": score.date.isoformat(),
            }
            for score, channel in rows
        ]
