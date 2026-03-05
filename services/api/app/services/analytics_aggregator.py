"""Modul 15: Cross-Platform Analytics Aggregator service."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AdMetric, PostMetric
from app.models.channel import SocialChannel

logger = logging.getLogger(__name__)

PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "twitter"]


class AnalyticsAggregatorService:
    def __init__(self):
        pass

    async def get_overview_kpis(self, db: AsyncSession) -> dict:
        """Get cross-platform KPI overview for the dashboard."""
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # Current period metrics
        current_result = await db.execute(
            select(
                func.sum(PostMetric.impressions).label("impressions"),
                func.sum(PostMetric.reach).label("reach"),
                func.sum(PostMetric.likes).label("likes"),
                func.sum(PostMetric.comments).label("comments"),
                func.sum(PostMetric.shares).label("shares"),
                func.sum(PostMetric.saves).label("saves"),
                func.sum(PostMetric.clicks).label("clicks"),
                func.avg(PostMetric.engagement_rate).label("avg_engagement"),
                func.sum(PostMetric.new_followers_attributed).label("new_followers"),
                func.count(PostMetric.id).label("total_posts"),
            )
            .where(PostMetric.timestamp >= thirty_days_ago)
        )
        current = current_result.one()

        # Previous period for comparison
        previous_result = await db.execute(
            select(
                func.sum(PostMetric.impressions).label("impressions"),
                func.sum(PostMetric.reach).label("reach"),
                func.avg(PostMetric.engagement_rate).label("avg_engagement"),
                func.sum(PostMetric.new_followers_attributed).label("new_followers"),
            )
            .where(
                PostMetric.timestamp >= sixty_days_ago,
                PostMetric.timestamp < thirty_days_ago,
            )
        )
        previous = previous_result.one()

        # Ad spend metrics
        ad_result = await db.execute(
            select(
                func.sum(AdMetric.spend).label("total_spend"),
                func.sum(AdMetric.conversions).label("total_conversions"),
                func.sum(AdMetric.conversion_value).label("total_conversion_value"),
                func.avg(AdMetric.roas).label("avg_roas"),
                func.avg(AdMetric.cpm).label("avg_cpm"),
                func.avg(AdMetric.cpc).label("avg_cpc"),
            )
            .where(AdMetric.timestamp >= thirty_days_ago)
        )
        ad_metrics = ad_result.one()

        # Calculate period-over-period changes
        def pct_change(current_val, previous_val):
            c = current_val or 0
            p = previous_val or 0
            if p == 0:
                return 0.0
            return round(((c - p) / p) * 100, 1)

        return {
            "period": "30d",
            "organic": {
                "impressions": current.impressions or 0,
                "reach": current.reach or 0,
                "likes": current.likes or 0,
                "comments": current.comments or 0,
                "shares": current.shares or 0,
                "saves": current.saves or 0,
                "clicks": current.clicks or 0,
                "avg_engagement_rate": round(float(current.avg_engagement or 0), 2),
                "new_followers": current.new_followers or 0,
                "total_posts": current.total_posts or 0,
            },
            "paid": {
                "total_spend": round(float(ad_metrics.total_spend or 0), 2),
                "conversions": ad_metrics.total_conversions or 0,
                "conversion_value": round(float(ad_metrics.total_conversion_value or 0), 2),
                "avg_roas": round(float(ad_metrics.avg_roas or 0), 2),
                "avg_cpm": round(float(ad_metrics.avg_cpm or 0), 2),
                "avg_cpc": round(float(ad_metrics.avg_cpc or 0), 2),
            },
            "trends": {
                "impressions_change": pct_change(current.impressions, previous.impressions),
                "reach_change": pct_change(current.reach, previous.reach),
                "engagement_change": pct_change(current.avg_engagement, previous.avg_engagement),
                "followers_change": pct_change(current.new_followers, previous.new_followers),
            },
        }

    async def get_platform_breakdown(self, db: AsyncSession, days: int = 30) -> dict:
        """Get performance breakdown by platform."""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Get Dinamo channels
        channels_result = await db.execute(
            select(SocialChannel).where(SocialChannel.owner_type == "dinamo")
        )
        channels = channels_result.scalars().all()
        channel_map = {str(ch.id): ch for ch in channels}

        # Post metrics joined with content posts to get platform
        from app.models.content import ContentPost

        platform_result = await db.execute(
            select(
                ContentPost.platform,
                func.sum(PostMetric.impressions).label("impressions"),
                func.sum(PostMetric.reach).label("reach"),
                func.sum(PostMetric.likes).label("likes"),
                func.sum(PostMetric.comments).label("comments"),
                func.sum(PostMetric.shares).label("shares"),
                func.avg(PostMetric.engagement_rate).label("avg_engagement"),
                func.count(PostMetric.id).label("post_count"),
            )
            .join(ContentPost, PostMetric.post_id == ContentPost.id)
            .where(PostMetric.timestamp >= cutoff)
            .group_by(ContentPost.platform)
        )
        rows = platform_result.all()

        if not rows:
            return {
                "period_days": days,
                "platforms": {p: {"impressions": 0, "reach": 0, "engagement": 0.0} for p in PLATFORMS},
            }

        platforms = {}
        for row in rows:
            platforms[row.platform] = {
                "impressions": row.impressions or 0,
                "reach": row.reach or 0,
                "likes": row.likes or 0,
                "comments": row.comments or 0,
                "shares": row.shares or 0,
                "avg_engagement_rate": round(float(row.avg_engagement or 0), 2),
                "post_count": row.post_count or 0,
            }

        # Add missing platforms with zeros
        for p in PLATFORMS:
            if p not in platforms:
                platforms[p] = {
                    "impressions": 0,
                    "reach": 0,
                    "likes": 0,
                    "comments": 0,
                    "shares": 0,
                    "avg_engagement_rate": 0.0,
                    "post_count": 0,
                }

        return {
            "period_days": days,
            "platforms": platforms,
        }

    async def get_market_performance(self, db: AsyncSession) -> list[dict]:
        """Get content performance by target market."""
        from app.models.content import ContentPlan, ContentPost
        from app.models.market import Country

        result = await db.execute(
            select(
                Country.name,
                Country.code,
                func.count(ContentPost.id).label("post_count"),
                func.sum(PostMetric.impressions).label("impressions"),
                func.sum(PostMetric.reach).label("reach"),
                func.avg(PostMetric.engagement_rate).label("avg_engagement"),
            )
            .join(ContentPlan, ContentPost.plan_id == ContentPlan.id)
            .join(Country, ContentPlan.market_id == Country.id)
            .join(PostMetric, PostMetric.post_id == ContentPost.id)
            .group_by(Country.name, Country.code)
            .order_by(func.sum(PostMetric.impressions).desc())
        )
        rows = result.all()

        if not rows:
            return [
                {
                    "market": "Croatia",
                    "code": "HR",
                    "post_count": 0,
                    "impressions": 0,
                    "reach": 0,
                    "avg_engagement_rate": 0.0,
                }
            ]

        return [
            {
                "market": row.name,
                "code": row.code,
                "post_count": row.post_count or 0,
                "impressions": row.impressions or 0,
                "reach": row.reach or 0,
                "avg_engagement_rate": round(float(row.avg_engagement or 0), 2),
            }
            for row in rows
        ]

    async def get_content_rankings(self, db: AsyncSession, limit: int = 20) -> list[dict]:
        """Get top-performing content posts ranked by engagement."""
        from app.models.content import ContentPost

        result = await db.execute(
            select(ContentPost, PostMetric)
            .join(PostMetric, PostMetric.post_id == ContentPost.id)
            .order_by(PostMetric.engagement_rate.desc())
            .limit(limit)
        )
        rows = result.all()

        if not rows:
            return [
                {
                    "rank": 1,
                    "message": "No content metrics available yet",
                    "platform": "N/A",
                    "engagement_rate": 0.0,
                }
            ]

        rankings = []
        for rank, (post, metric) in enumerate(rows, start=1):
            rankings.append({
                "rank": rank,
                "post_id": str(post.id),
                "platform": post.platform,
                "content_pillar": post.content_pillar,
                "caption_preview": (post.caption_en or post.caption_hr or "")[:80],
                "is_champions_league": post.is_champions_league,
                "is_academy": post.is_academy,
                "impressions": metric.impressions,
                "reach": metric.reach,
                "likes": metric.likes,
                "comments": metric.comments,
                "shares": metric.shares,
                "engagement_rate": round(metric.engagement_rate, 2),
                "published_at": post.published_at.isoformat() if post.published_at else None,
            })

        return rankings
