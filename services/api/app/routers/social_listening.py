from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.database import get_db
from app.dependencies import get_meta_client, get_claude_client
from app.services.social_listener import SocialListenerService
from app.models.sentiment import BrandMention, TrendingTopic

router = APIRouter()


def _get_service():
    return SocialListenerService(
        get_meta_client(),
        get_claude_client(),
    )


@router.post("/scan")
async def scan_brand_mentions(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.scan_brand_mentions(db)
    return result


@router.get("/trending")
async def get_trending_page_data(
    days: int = Query(default=7),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns {metrics, recentMentions, trendingTopics} for SocialListening page."""
    service = _get_service()
    cutoff = datetime.utcnow() - timedelta(days=days)
    prev_cutoff = datetime.utcnow() - timedelta(days=days * 2)

    # Total mentions (current period)
    total_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(BrandMention.detected_at >= cutoff)
    )
    total_mentions = total_result.scalar() or 0

    # Total mentions (previous period)
    prev_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(
            BrandMention.detected_at >= prev_cutoff,
            BrandMention.detected_at < cutoff,
        )
    )
    prev_mentions = prev_result.scalar() or 0

    # Get trending topics count
    topics_result = await db.execute(
        select(TrendingTopic)
        .where(TrendingTopic.last_updated >= cutoff)
        .order_by(TrendingTopic.volume.desc())
        .limit(15)
    )
    topics_db = topics_result.scalars().all()

    # Share of voice (simplified: positive mentions / total)
    positive_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(
            BrandMention.detected_at >= cutoff,
            BrandMention.sentiment == "positive",
        )
    )
    positive_count = positive_result.scalar() or 0
    share_of_voice = round(positive_count / max(total_mentions, 1) * 100)

    prev_positive_result = await db.execute(
        select(func.count(BrandMention.id))
        .where(
            BrandMention.detected_at >= prev_cutoff,
            BrandMention.detected_at < cutoff,
            BrandMention.sentiment == "positive",
        )
    )
    prev_positive = prev_positive_result.scalar() or 0
    prev_share_of_voice = round(prev_positive / max(prev_mentions, 1) * 100)

    metrics = {
        "totalMentions": total_mentions,
        "prevMentions": prev_mentions,
        "shareOfVoice": share_of_voice,
        "prevShareOfVoice": prev_share_of_voice,
        "trendingCount": len(topics_db),
    }

    # Recent mentions
    mentions_result = await db.execute(
        select(BrandMention)
        .order_by(BrandMention.detected_at.desc())
        .limit(10)
    )
    mentions_db = mentions_result.scalars().all()

    recent_mentions = []
    for i, m in enumerate(mentions_db, 1):
        hours_ago = max(1, int((datetime.utcnow() - m.detected_at.replace(tzinfo=None)).total_seconds() / 3600))
        if hours_ago < 1:
            time_str = "upravo"
        elif hours_ago < 24:
            time_str = f"prije {hours_ago} {'sat' if hours_ago == 1 else 'sati' if hours_ago < 5 else 'sati'}"
        else:
            time_str = f"prije {hours_ago // 24} dana"

        recent_mentions.append({
            "id": i,
            "platform": m.platform,
            "author": m.author or f"@user_{i}",
            "text": m.text[:200] if m.text else "",
            "sentiment": m.sentiment,
            "time": time_str,
            "reach": m.reach_estimate,
        })

    # Trending topics
    trending_topics = []
    for i, t in enumerate(topics_db, 1):
        growth = t.growth_rate or 0
        if growth > 30:
            velocity = "u porastu"
        elif growth > 10:
            velocity = "raste"
        else:
            velocity = "stabilno"

        trending_topics.append({
            "id": i,
            "topic": t.topic,
            "mentions": t.volume,
            "change": f"+{growth:.0f}%" if growth >= 0 else f"{growth:.0f}%",
            "velocity": velocity,
        })

    return {
        "metrics": metrics,
        "recentMentions": recent_mentions,
        "trendingTopics": trending_topics,
    }


@router.get("/share-of-voice")
async def get_share_of_voice(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_share_of_voice(db)
    return result


@router.get("/crisis")
async def detect_crisis(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.detect_crisis(db)
    return result
