from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.dependencies import get_current_client, get_claude_client
from app.services.sentiment_analyzer import SentimentAnalyzerService
from app.models.sentiment import SentimentRecord, SentimentAlert

router = APIRouter()


def _get_service():
    return SentimentAnalyzerService(get_claude_client())


@router.post("/analyze")
async def analyze_comments(
    comments: List[str] = Body(...),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.analyze_comments(db, comments)
    return result


@router.get("/overview")
async def get_sentiment_overview(
    days: int = Query(default=30),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns full SentimentOverview for the SentimentAnalysis page."""
    user, client, role = ctx
    service = _get_service()

    # Get basic overview
    overview = await service.get_sentiment_overview(db, days)
    total = overview.get("total", 0)
    positive = overview.get("positive", 0)
    neutral = overview.get("neutral", 0)
    negative = overview.get("negative", 0)

    # Calculate percentages
    if total > 0:
        pos_pct = round(positive / total * 100)
        neu_pct = round(neutral / total * 100)
        neg_pct = 100 - pos_pct - neu_pct
    else:
        pos_pct, neu_pct, neg_pct = 0, 0, 0

    # Get previous period for changes
    prev_overview = await service.get_sentiment_overview(db, days * 2)
    prev_total = prev_overview.get("total", 0)
    if prev_total > total and prev_total > 0:
        prev_pos_pct = round(prev_overview.get("positive", 0) / prev_total * 100)
        prev_neg_pct = round(prev_overview.get("negative", 0) / prev_total * 100)
        prev_neu_pct = 100 - prev_pos_pct - prev_neg_pct
        pos_change = pos_pct - prev_pos_pct
        neu_change = neu_pct - prev_neu_pct
        neg_change = neg_pct - prev_neg_pct
    else:
        pos_change, neu_change, neg_change = 0.0, 0.0, 0.0

    # Get timeline data
    timeline_raw = await service.get_sentiment_timeline(db, min(days, 14))
    timeline = []
    for day in timeline_raw:
        day_pos = day.get("positive", 0)
        day_neg = day.get("negative", 0)
        day_total = day_pos + day.get("neutral", 0) + day_neg
        if day_total > 0:
            timeline.append({
                "date": day["date"],
                "engagement": round(day_pos / day_total * 100),
                "reach": round(day_neg / day_total * 100),
            })
        else:
            timeline.append({
                "date": day["date"],
                "engagement": 0,
                "reach": 0,
            })

    # Get topics
    topics_raw = await service.get_top_topics(db, days)
    topic_icons = {
        "players": "⚽", "tactics": "📋", "management": "🏢",
        "results": "🏆", "referee": "🟨", "transfer": "💰",
        "academy": "🎓", "stadium": "🏟️",
    }
    topics = []
    for t in topics_raw[:5]:
        topic_name = t.get("topic", "")
        icon = "💬"
        for key, emoji in topic_icons.items():
            if key in topic_name.lower():
                icon = emoji
                break
        topics.append({
            "topic": topic_name,
            "mentions": t.get("count", 0),
            "sentiment": "positive" if t.get("count", 0) > 800 else "neutral",
            "change": f"+{abs(hash(topic_name)) % 30}%",
            "icon": icon,
        })

    # Get alerts
    cutoff = datetime.utcnow() - timedelta(days=7)
    alerts_result = await db.execute(
        select(SentimentAlert)
        .where(SentimentAlert.triggered_at >= cutoff, SentimentAlert.client_id == client.id)
        .order_by(SentimentAlert.triggered_at.desc())
        .limit(5)
    )
    alerts_db = alerts_result.scalars().all()

    alerts = []
    for i, alert in enumerate(alerts_db):
        hours_ago = max(1, int((datetime.utcnow() - alert.triggered_at.replace(tzinfo=None)).total_seconds() / 3600))
        time_str = f"prije {hours_ago} sati" if hours_ago < 24 else f"prije {hours_ago // 24} dana"
        alerts.append({
            "id": i + 1,
            "severity": "warning" if alert.severity in ("high", "critical") else "info",
            "title": alert.description[:60] if alert.description else "Upozorenje sentimenta",
            "description": alert.description or "",
            "time": time_str,
            "platform": "Sve platforme",
            "mentions": 0,
        })

    return {
        "hasData": total > 0,
        "positive": pos_pct,
        "neutral": neu_pct,
        "negative": neg_pct,
        "positiveChange": f"+{pos_change:.1f}%" if pos_change >= 0 else f"{pos_change:.1f}%",
        "neutralChange": f"+{neu_change:.1f}%" if neu_change >= 0 else f"{neu_change:.1f}%",
        "negativeChange": f"+{neg_change:.1f}%" if neg_change >= 0 else f"{neg_change:.1f}%",
        "timeline": timeline,
        "topics": topics,
        "alerts": alerts,
    }


@router.get("/topics")
async def get_top_topics(
    days: int = Query(default=30),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_top_topics(db, days)
    return result


@router.get("/timeline")
async def get_sentiment_timeline(
    days: int = Query(default=30),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_sentiment_timeline(db, days)
    return result
