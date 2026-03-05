from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

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

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

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
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
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
