import logging
import time
from uuid import UUID

import redis.asyncio as aioredis
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import (
    get_meta_client,
    get_tiktok_client,
    get_youtube_client,
    get_ga4_client,
    get_sports_data_client,
    get_claude_client,
    get_buffer_client,
    get_image_gen_client,
    get_trends_client,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    checks = {}
    overall = "healthy"

    # DB check with latency
    try:
        t0 = time.monotonic()
        await db.execute(text("SELECT 1"))
        latency = round((time.monotonic() - t0) * 1000, 1)
        checks["database"] = {"status": "healthy", "latency_ms": latency}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        overall = "degraded"

    # Redis check
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        checks["redis"] = {"status": "healthy"}
        await r.aclose()
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}
        overall = "degraded"

    # Celery check
    try:
        from app.tasks.celery_app import celery_app

        inspect = celery_app.control.inspect(timeout=2.0)
        active = inspect.active_queues()
        worker_count = len(active) if active else 0
        checks["celery"] = {
            "status": "healthy" if worker_count > 0 else "no_workers",
            "workers": worker_count,
        }
    except Exception as e:
        checks["celery"] = {"status": "unknown", "error": str(e)}

    # Circuit breaker statuses
    try:
        from app.services.circuit_breaker import get_all_breaker_statuses

        checks["circuit_breakers"] = get_all_breaker_statuses()
    except Exception:
        checks["circuit_breakers"] = {}

    # API client modes
    clients = {
        "meta": get_meta_client(),
        "tiktok": get_tiktok_client(),
        "youtube": get_youtube_client(),
        "ga4": get_ga4_client(),
        "sports_data": get_sports_data_client(),
        "claude": get_claude_client(),
        "buffer": get_buffer_client(),
        "image_gen": get_image_gen_client(),
        "trends": get_trends_client(),
    }

    api_status = {}
    for name, client in clients.items():
        is_mock = getattr(client, "is_mock", None)
        api_status[name] = {
            "mode": "mock" if is_mock else "real",
            "available": client is not None,
        }

    return {
        "status": overall,
        "database": checks.get("database", {}),
        "redis": checks.get("redis", {}),
        "celery": checks.get("celery", {}),
        "circuit_breakers": checks.get("circuit_breakers", {}),
        "apis": api_status,
    }


@router.get("/api-status")
async def get_api_status():
    clients = {
        "meta": get_meta_client(),
        "tiktok": get_tiktok_client(),
        "youtube": get_youtube_client(),
        "ga4": get_ga4_client(),
        "sports_data": get_sports_data_client(),
        "claude": get_claude_client(),
        "buffer": get_buffer_client(),
        "image_gen": get_image_gen_client(),
        "trends": get_trends_client(),
    }

    status = {}
    for name, client in clients.items():
        is_mock = getattr(client, "is_mock", None)
        status[name] = "mock" if is_mock else "real"

    return status


@router.put("/api-toggle")
async def toggle_api(
    api_name: str = Body(...),
    use_mock: bool = Body(...),
):
    clients = {
        "meta": get_meta_client(),
        "tiktok": get_tiktok_client(),
        "youtube": get_youtube_client(),
        "ga4": get_ga4_client(),
        "sports_data": get_sports_data_client(),
        "claude": get_claude_client(),
        "buffer": get_buffer_client(),
        "image_gen": get_image_gen_client(),
        "trends": get_trends_client(),
    }

    if api_name not in clients:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown API: {api_name}. Valid options: {list(clients.keys())}",
        )

    client = clients[api_name]
    if hasattr(client, "set_mock"):
        client.set_mock(use_mock)
    elif hasattr(client, "is_mock"):
        client.is_mock = use_mock
    else:
        raise HTTPException(
            status_code=400,
            detail=f"API '{api_name}' does not support mock toggling",
        )

    return {"api": api_name, "mode": "mock" if use_mock else "real"}


@router.get("/brand")
async def get_brand_guidelines():
    return {
        "primary_color": "#0057A8",
        "primary_light": "#1a6fbf",
        "primary_dark": "#004080",
        "dark": "#0A0E1A",
        "accent": "#00A8E8",
        "white": "#FFFFFF",
        "headline_font": "Bebas Neue",
        "body_font": "Barlow Condensed",
        "stats_font": "Oswald",
        "club_name": "GNK Dinamo Zagreb",
        "founded": 1945,
        "stadium": "Stadion Maksimir, Zagreb",
    }


@router.get("/notifications")
async def get_notification_settings():
    return [
        {"id": "sentiment_alert", "label": "Sentiment Alerts", "description": "Notify when negative sentiment exceeds threshold", "enabled": True},
        {"id": "campaign_budget", "label": "Campaign Budget Alerts", "description": "Alert when campaign spend reaches 80% of budget", "enabled": True},
        {"id": "weekly_report", "label": "Weekly Report Ready", "description": "Notification when weekly report is generated", "enabled": True},
        {"id": "mention_spike", "label": "Mention Spike Detection", "description": "Alert on unusual mention volume", "enabled": False},
        {"id": "competitor_alert", "label": "Competitor Activity", "description": "Notify on significant competitor changes", "enabled": False},
        {"id": "content_approval", "label": "Content Approval Required", "description": "Alert when content needs approval", "enabled": True},
    ]


@router.get("/notifications/recent")
async def get_recent_notifications(db: AsyncSession = Depends(get_db)):
    """Get recent notifications from DB."""
    from app.models.notification import Notification

    result = await db.execute(
        select(Notification).order_by(Notification.created_at.desc()).limit(20)
    )
    notifications = result.scalars().all()
    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "severity": n.severity,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        }
        for n in notifications
    ]


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID, db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read."""
    from app.models.notification import Notification

    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    return {"status": "ok"}


@router.get("/quotas")
async def get_api_quotas():
    """Get API quota usage for all tracked services."""
    from app.services.quota_tracker import quota_tracker

    return await quota_tracker.get_all_usage()
