"""Modul 10: Sentiment Analysis Engine service."""

import logging
from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sentiment import BrandMention, SentimentAlert, SentimentRecord

logger = logging.getLogger(__name__)


class SentimentAnalyzerService:
    def __init__(self, claude_client):
        self.claude_client = claude_client

    async def analyze_comments(self, db: AsyncSession, comments: list[dict]) -> list[dict]:
        """Analyze a batch of comments for sentiment."""
        if not comments:
            return []

        texts = [c.get("text", "") for c in comments]
        results = await self.claude_client.analyze_sentiment(texts)

        records = []
        for comment, result in zip(comments, results):
            record = SentimentRecord(
                source_type=comment.get("source_type", "post_comment"),
                source_id=comment.get("source_id"),
                platform=comment.get("platform", "instagram"),
                text=comment.get("text", ""),
                language=result.get("language", "hr"),
                sentiment=result.get("sentiment", "neutral"),
                confidence=result.get("confidence", 0.0),
                topics=result.get("topics"),
            )
            db.add(record)
            records.append({
                "text": comment.get("text", "")[:100],
                "sentiment": result.get("sentiment"),
                "confidence": result.get("confidence"),
                "topics": result.get("topics"),
            })

        # Check for negative spike
        negative_count = sum(1 for r in records if r["sentiment"] == "negative")
        if len(records) > 5 and negative_count / len(records) > 0.4:
            alert = SentimentAlert(
                alert_type="spike_negative",
                severity="high",
                description=f"Negative sentiment spike detected: {negative_count}/{len(records)} comments are negative",
            )
            db.add(alert)
            logger.warning(f"Negative sentiment spike: {negative_count}/{len(records)}")

        await db.flush()
        logger.info(f"Analyzed {len(records)} comments")
        return records

    async def get_sentiment_overview(self, db: AsyncSession, days: int = 30) -> dict:
        """Get sentiment overview for last N days."""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = await db.execute(
            select(
                SentimentRecord.sentiment,
                func.count(SentimentRecord.id).label("count"),
            )
            .where(SentimentRecord.analyzed_at >= cutoff)
            .group_by(SentimentRecord.sentiment)
        )
        counts = {row.sentiment: row.count for row in result}

        total = sum(counts.values())
        return {
            "positive": counts.get("positive", 0),
            "neutral": counts.get("neutral", 0),
            "negative": counts.get("negative", 0),
            "total": total,
            "positive_pct": round(counts.get("positive", 0) / max(total, 1) * 100, 1),
            "negative_pct": round(counts.get("negative", 0) / max(total, 1) * 100, 1),
        }

    async def get_top_topics(self, db: AsyncSession, days: int = 30) -> list[dict]:
        """Extract top topics from sentiment records."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await db.execute(
            select(SentimentRecord.topics)
            .where(
                SentimentRecord.analyzed_at >= cutoff,
                SentimentRecord.topics.isnot(None),
            )
        )

        topic_counter: Counter = Counter()
        for (topics,) in result:
            if isinstance(topics, list):
                topic_counter.update(topics)
            elif isinstance(topics, dict):
                topic_counter.update(topics.keys())

        return [
            {"topic": topic, "count": count}
            for topic, count in topic_counter.most_common(10)
        ]

    async def get_sentiment_timeline(self, db: AsyncSession, days: int = 30) -> list[dict]:
        """Get daily sentiment breakdown."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await db.execute(
            select(
                func.date(SentimentRecord.analyzed_at).label("date"),
                SentimentRecord.sentiment,
                func.count(SentimentRecord.id).label("count"),
            )
            .where(SentimentRecord.analyzed_at >= cutoff)
            .group_by(func.date(SentimentRecord.analyzed_at), SentimentRecord.sentiment)
            .order_by(func.date(SentimentRecord.analyzed_at))
        )

        daily: dict = {}
        for row in result:
            date_str = str(row.date)
            if date_str not in daily:
                daily[date_str] = {"date": date_str, "positive": 0, "neutral": 0, "negative": 0}
            daily[date_str][row.sentiment] = row.count

        return list(daily.values())
