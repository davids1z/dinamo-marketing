"""Modul 11: Social Listening & Brand Monitoring service."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sentiment import BrandMention, TrendingTopic

logger = logging.getLogger(__name__)

# Brand keywords to monitor
BRAND_KEYWORDS = [
    "Demo Brand",
    "@demo_brand",
    "#DemoBrand",
    "#OurBrand",
]

# Crisis detection thresholds
CRISIS_NEGATIVE_RATIO = 0.5  # 50%+ negative mentions triggers crisis
CRISIS_MIN_MENTIONS = 20     # Minimum mentions to consider


class SocialListenerService:
    def __init__(self, meta_client, claude_client):
        self.meta_client = meta_client
        self.claude_client = claude_client

    async def scan_brand_mentions(self, db: AsyncSession) -> list[dict]:
        """Scan social platforms for brand mentions and persist them."""
        # Fetch mentions from Meta platforms
        try:
            raw_mentions = await self.meta_client.search_brand_mentions(BRAND_KEYWORDS)
        except Exception as exc:
            logger.error(f"Failed to fetch brand mentions from Meta: {exc}")
            raw_mentions = []

        if not raw_mentions:
            # Return recent mentions from DB as fallback
            result = await db.execute(
                select(BrandMention)
                .order_by(BrandMention.detected_at.desc())
                .limit(50)
            )
            existing = result.scalars().all()
            return [
                {
                    "id": str(m.id),
                    "platform": m.platform,
                    "author": m.author,
                    "text": m.text[:200],
                    "sentiment": m.sentiment,
                    "reach_estimate": m.reach_estimate,
                    "is_influencer": m.is_influencer,
                    "detected_at": m.detected_at.isoformat(),
                }
                for m in existing
            ]

        # Analyze sentiment via Claude
        texts = [m.get("text", "") for m in raw_mentions]
        try:
            sentiment_results = await self.claude_client.analyze_sentiment(texts)
        except Exception as exc:
            logger.error(f"Sentiment analysis failed: {exc}")
            sentiment_results = [{"sentiment": "neutral", "confidence": 0.0}] * len(texts)

        persisted = []
        for mention_data, sentiment in zip(raw_mentions, sentiment_results):
            mention = BrandMention(
                platform=mention_data.get("platform", "instagram"),
                author=mention_data.get("author", ""),
                text=mention_data.get("text", ""),
                url=mention_data.get("url", ""),
                sentiment=sentiment.get("sentiment", "neutral"),
                reach_estimate=mention_data.get("reach_estimate", 0),
                is_influencer=mention_data.get("followers", 0) > 10000,
            )
            db.add(mention)
            persisted.append({
                "platform": mention.platform,
                "author": mention.author,
                "text": mention.text[:200],
                "sentiment": mention.sentiment,
                "reach_estimate": mention.reach_estimate,
                "is_influencer": mention.is_influencer,
            })

        await db.flush()
        logger.info(f"Scanned and stored {len(persisted)} brand mentions")
        return persisted

    async def get_trending_topics(self, db: AsyncSession, days: int = 7) -> list[dict]:
        """Get trending topics related to the brand."""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = await db.execute(
            select(TrendingTopic)
            .where(TrendingTopic.last_updated >= cutoff)
            .order_by(TrendingTopic.volume.desc())
            .limit(15)
        )
        topics = result.scalars().all()

        if not topics:
            # Generate trending topics from recent mentions
            mentions_result = await db.execute(
                select(BrandMention.text)
                .where(BrandMention.detected_at >= cutoff)
                .limit(200)
            )
            mention_texts = [row[0] for row in mentions_result.all()]

            if mention_texts:
                try:
                    extracted = await self.claude_client.extract_trending_topics(mention_texts)
                    for topic_data in extracted:
                        topic = TrendingTopic(
                            topic=topic_data.get("topic", ""),
                            volume=topic_data.get("volume", 0),
                            growth_rate=topic_data.get("growth_rate", 0.0),
                            related_keywords=topic_data.get("related_keywords"),
                        )
                        db.add(topic)
                    await db.flush()
                    return extracted
                except Exception as exc:
                    logger.error(f"Topic extraction failed: {exc}")

            return [
                {
                    "topic": "Champions League",
                    "volume": 0,
                    "growth_rate": 0.0,
                    "related_keywords": ["UCL", "Liga prvaka"],
                }
            ]

        return [
            {
                "id": str(t.id),
                "topic": t.topic,
                "volume": t.volume,
                "growth_rate": t.growth_rate,
                "related_keywords": t.related_keywords or [],
                "first_detected": t.first_detected.isoformat(),
                "last_updated": t.last_updated.isoformat(),
            }
            for t in topics
        ]

    async def get_share_of_voice(self, db: AsyncSession) -> dict:
        """Calculate brand's share of voice vs competitors in mentions."""
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Total brand mentions
        total_result = await db.execute(
            select(func.count(BrandMention.id))
            .where(BrandMention.detected_at >= thirty_days_ago)
        )
        total_mentions = total_result.scalar() or 0

        # Sentiment breakdown
        sentiment_result = await db.execute(
            select(
                BrandMention.sentiment,
                func.count(BrandMention.id).label("count"),
            )
            .where(BrandMention.detected_at >= thirty_days_ago)
            .group_by(BrandMention.sentiment)
        )
        sentiment_counts = {row.sentiment: row.count for row in sentiment_result}

        # Mentions by platform
        platform_result = await db.execute(
            select(
                BrandMention.platform,
                func.count(BrandMention.id).label("count"),
                func.sum(BrandMention.reach_estimate).label("total_reach"),
            )
            .where(BrandMention.detected_at >= thirty_days_ago)
            .group_by(BrandMention.platform)
        )
        platform_breakdown = [
            {
                "platform": row.platform,
                "mentions": row.count,
                "total_reach": row.total_reach or 0,
            }
            for row in platform_result
        ]

        # Influencer mentions
        influencer_result = await db.execute(
            select(func.count(BrandMention.id))
            .where(
                BrandMention.detected_at >= thirty_days_ago,
                BrandMention.is_influencer == True,
            )
        )
        influencer_mentions = influencer_result.scalar() or 0

        return {
            "period_days": 30,
            "total_mentions": total_mentions,
            "sentiment": {
                "positive": sentiment_counts.get("positive", 0),
                "neutral": sentiment_counts.get("neutral", 0),
                "negative": sentiment_counts.get("negative", 0),
            },
            "positive_pct": round(
                sentiment_counts.get("positive", 0) / max(total_mentions, 1) * 100, 1
            ),
            "platform_breakdown": platform_breakdown,
            "influencer_mentions": influencer_mentions,
            "estimated_total_reach": sum(p["total_reach"] for p in platform_breakdown),
        }

    async def detect_crisis(self, db: AsyncSession) -> dict | None:
        """Detect potential PR crisis based on negative mention surge."""
        six_hours_ago = datetime.utcnow() - timedelta(hours=6)

        # Get recent mentions
        result = await db.execute(
            select(
                BrandMention.sentiment,
                func.count(BrandMention.id).label("count"),
            )
            .where(BrandMention.detected_at >= six_hours_ago)
            .group_by(BrandMention.sentiment)
        )
        counts = {row.sentiment: row.count for row in result}
        total = sum(counts.values())

        if total < CRISIS_MIN_MENTIONS:
            return None

        negative_ratio = counts.get("negative", 0) / total

        if negative_ratio >= CRISIS_NEGATIVE_RATIO:
            # Fetch the most negative mentions for context
            negative_result = await db.execute(
                select(BrandMention)
                .where(
                    BrandMention.detected_at >= six_hours_ago,
                    BrandMention.sentiment == "negative",
                )
                .order_by(BrandMention.reach_estimate.desc())
                .limit(10)
            )
            top_negative = negative_result.scalars().all()

            # Generate crisis summary via Claude
            try:
                crisis_summary = await self.claude_client.summarize_crisis(
                    [m.text for m in top_negative]
                )
            except Exception:
                crisis_summary = "High volume of negative mentions detected."

            logger.warning(
                f"CRISIS DETECTED: {counts.get('negative', 0)}/{total} negative "
                f"mentions in last 6 hours ({negative_ratio:.0%})"
            )

            return {
                "crisis_detected": True,
                "severity": "critical" if negative_ratio > 0.7 else "high",
                "negative_ratio": round(negative_ratio, 2),
                "total_mentions": total,
                "negative_count": counts.get("negative", 0),
                "summary": crisis_summary,
                "top_mentions": [
                    {
                        "author": m.author,
                        "text": m.text[:300],
                        "platform": m.platform,
                        "reach": m.reach_estimate,
                    }
                    for m in top_negative[:5]
                ],
                "detected_at": datetime.utcnow().isoformat(),
            }

        return None
