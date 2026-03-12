"""Modul 3: Competitor Intelligence Hub service."""

import logging
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.competitor import Competitor, CompetitorAlert, CompetitorMetric

logger = logging.getLogger(__name__)

# Engagement spike threshold: 2x the 30-day average
SPIKE_THRESHOLD = 2.0

# Default competitors for benchmark group
DEFAULT_COMPETITORS = [
    "Red Star Belgrade",
    "Olympiacos",
    "Celtic",
    "Red Bull Salzburg",
    "Shakhtar Donetsk",
    "PAOK",
    "Ferencvaros",
    "Malmo FF",
]


class CompetitorIntelService:
    def __init__(self, meta_client, youtube_client):
        self.meta_client = meta_client
        self.youtube_client = youtube_client

    async def scan_all_competitors(self, db: AsyncSession) -> list[dict]:
        """Scan all registered competitors and update their metrics."""
        result = await db.execute(select(Competitor))
        competitors = result.scalars().all()

        if not competitors:
            logger.warning("No competitors found in database")
            return [
                {
                    "name": name,
                    "status": "not_registered",
                    "message": "Competitor not yet in database",
                }
                for name in DEFAULT_COMPETITORS
            ]

        scan_results = []
        today = date.today()

        for comp in competitors:
            try:
                # Fetch Instagram metrics via Meta API
                ig_data = await self.meta_client.get_public_profile_stats(comp.short_name)
                ig_metric = CompetitorMetric(
                    competitor_id=comp.id,
                    platform="instagram",
                    date=today,
                    followers=ig_data.get("followers", 0),
                    engagement_rate=ig_data.get("engagement_rate", 0.0),
                    content_formats=ig_data.get("content_formats"),
                    target_markets=ig_data.get("target_markets"),
                    language_strategy=ig_data.get("language_strategy", ""),
                )
                db.add(ig_metric)

                # Fetch YouTube metrics
                yt_data = await self.youtube_client.get_channel_stats(comp.short_name)
                yt_metric = CompetitorMetric(
                    competitor_id=comp.id,
                    platform="youtube",
                    date=today,
                    followers=yt_data.get("subscribers", 0),
                    engagement_rate=yt_data.get("engagement_rate", 0.0),
                    content_formats=yt_data.get("content_formats"),
                    target_markets=yt_data.get("target_markets"),
                    language_strategy=yt_data.get("language_strategy", ""),
                )
                db.add(yt_metric)

                scan_results.append({
                    "competitor_id": str(comp.id),
                    "name": comp.name,
                    "instagram_followers": ig_data.get("followers", 0),
                    "instagram_engagement": ig_data.get("engagement_rate", 0.0),
                    "youtube_subscribers": yt_data.get("subscribers", 0),
                    "youtube_engagement": yt_data.get("engagement_rate", 0.0),
                    "status": "scanned",
                })
            except Exception as exc:
                logger.error(f"Failed to scan competitor {comp.name}: {exc}")
                scan_results.append({
                    "competitor_id": str(comp.id),
                    "name": comp.name,
                    "status": "error",
                    "error": str(exc),
                })

        await db.flush()
        logger.info(f"Scanned {len(scan_results)} competitors")
        return scan_results

    async def get_competitor_comparison(self, db: AsyncSession) -> dict:
        """Generate a gap analysis comparing the brand vs all competitors."""
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        # Get latest competitor metrics
        latest_subq = (
            select(
                CompetitorMetric.competitor_id,
                CompetitorMetric.platform,
                func.max(CompetitorMetric.date).label("max_date"),
            )
            .group_by(CompetitorMetric.competitor_id, CompetitorMetric.platform)
            .subquery()
        )

        result = await db.execute(
            select(CompetitorMetric, Competitor)
            .join(Competitor, CompetitorMetric.competitor_id == Competitor.id)
            .join(
                latest_subq,
                (CompetitorMetric.competitor_id == latest_subq.c.competitor_id)
                & (CompetitorMetric.platform == latest_subq.c.platform)
                & (CompetitorMetric.date == latest_subq.c.max_date),
            )
        )
        rows = result.all()

        if not rows:
            return {
                "status": "no_data",
                "message": "No competitor metrics available. Run a scan first.",
            }

        # Build comparison by competitor
        competitor_data: dict = {}
        for metric, comp in rows:
            if comp.name not in competitor_data:
                competitor_data[comp.name] = {
                    "name": comp.name,
                    "country": comp.country,
                    "league": comp.league,
                    "platforms": {},
                }
            competitor_data[comp.name]["platforms"][metric.platform] = {
                "followers": metric.followers,
                "engagement_rate": metric.engagement_rate,
                "language_strategy": metric.language_strategy,
            }

        # Calculate averages for benchmarking
        all_ig_followers = [
            d["platforms"]["instagram"]["followers"]
            for d in competitor_data.values()
            if "instagram" in d["platforms"]
        ]
        all_ig_engagement = [
            d["platforms"]["instagram"]["engagement_rate"]
            for d in competitor_data.values()
            if "instagram" in d["platforms"]
        ]

        avg_ig_followers = sum(all_ig_followers) / len(all_ig_followers) if all_ig_followers else 0
        avg_ig_engagement = (
            sum(all_ig_engagement) / len(all_ig_engagement) if all_ig_engagement else 0.0
        )

        return {
            "analysis_date": today.isoformat(),
            "competitors": list(competitor_data.values()),
            "benchmarks": {
                "avg_instagram_followers": int(avg_ig_followers),
                "avg_instagram_engagement": round(avg_ig_engagement, 2),
            },
            "total_competitors": len(competitor_data),
        }

    async def check_competitor_alerts(self, db: AsyncSession) -> list[dict]:
        """Detect engagement spikes or viral posts from competitors."""
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        result = await db.execute(select(Competitor))
        competitors = result.scalars().all()

        alerts = []
        for comp in competitors:
            # Get recent metrics
            recent_result = await db.execute(
                select(CompetitorMetric)
                .where(
                    CompetitorMetric.competitor_id == comp.id,
                    CompetitorMetric.date >= seven_days_ago,
                )
                .order_by(CompetitorMetric.date.desc())
            )
            recent_metrics = recent_result.scalars().all()

            # Get 30-day baseline
            baseline_result = await db.execute(
                select(func.avg(CompetitorMetric.engagement_rate))
                .where(
                    CompetitorMetric.competitor_id == comp.id,
                    CompetitorMetric.date >= thirty_days_ago,
                    CompetitorMetric.date < seven_days_ago,
                )
            )
            baseline_avg = baseline_result.scalar() or 0.0

            for metric in recent_metrics:
                if baseline_avg > 0 and metric.engagement_rate > baseline_avg * SPIKE_THRESHOLD:
                    spike_ratio = metric.engagement_rate / baseline_avg
                    alert = CompetitorAlert(
                        competitor_id=comp.id,
                        alert_type="engagement_spike",
                        description=(
                            f"{comp.name} engagement spike on {metric.platform}: "
                            f"{metric.engagement_rate:.1f}% vs {baseline_avg:.1f}% baseline "
                            f"({spike_ratio:.1f}x)"
                        ),
                        engagement_spike=spike_ratio,
                    )
                    db.add(alert)
                    alerts.append({
                        "competitor": comp.name,
                        "alert_type": "engagement_spike",
                        "platform": metric.platform,
                        "current_engagement": metric.engagement_rate,
                        "baseline_engagement": round(baseline_avg, 2),
                        "spike_ratio": round(spike_ratio, 1),
                        "date": metric.date.isoformat(),
                    })

        # Also return recent unread alerts from DB
        unread_result = await db.execute(
            select(CompetitorAlert, Competitor)
            .join(Competitor, CompetitorAlert.competitor_id == Competitor.id)
            .where(CompetitorAlert.is_read == False)
            .order_by(CompetitorAlert.detected_at.desc())
            .limit(20)
        )
        for alert_row, comp_row in unread_result.all():
            alerts.append({
                "alert_id": str(alert_row.id),
                "competitor": comp_row.name,
                "alert_type": alert_row.alert_type,
                "description": alert_row.description,
                "spike_ratio": alert_row.engagement_spike,
                "detected_at": alert_row.detected_at.isoformat(),
                "is_read": alert_row.is_read,
            })

        await db.flush()
        logger.info(f"Checked alerts for {len(competitors)} competitors, found {len(alerts)}")
        return alerts
