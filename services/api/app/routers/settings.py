import logging
import time
from uuid import UUID

import redis.asyncio as aioredis
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
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

# ---------- Canonical API info ----------

API_CATALOG = [
    {"id": "meta", "name": "Meta Graph API", "description": "Instagram i Facebook podaci", "icon": "\ud83d\udcd8"},
    {"id": "tiktok", "name": "TikTok API", "description": "TikTok analitika i objavljivanje", "icon": "\ud83c\udfb5"},
    {"id": "youtube", "name": "YouTube Data API", "description": "YouTube kanal i video podaci", "icon": "\u25b6\ufe0f"},
    {"id": "ga4", "name": "Google Analytics 4", "description": "Promet web stranice i konverzije", "icon": "\ud83d\udcca"},
    {"id": "sports_data", "name": "Sports Data API", "description": "Rezultati utakmica i statistika igra\u010da", "icon": "\u26bd"},
    {"id": "claude", "name": "Claude AI", "description": "Generiranje sadr\u017eaja i analiza", "icon": "\ud83e\udd16"},
    {"id": "buffer", "name": "Buffer / Objavljivanje", "description": "Zakazivanje objava na dru\u0161tvenim mre\u017eama", "icon": "\ud83d\udcc5"},
    {"id": "image_gen", "name": "Generiranje slika", "description": "AI kreiranje slika za sadr\u017eaj", "icon": "\ud83c\udfa8"},
    {"id": "trends", "name": "Google Trends", "description": "Podaci o trendovima pretra\u017eivanja i uvidi", "icon": "\ud83d\udcc8"},
]

NOTIFICATION_CATALOG = [
    {"id": "sentiment_alert", "label": "Upozorenja sentimenta", "description": "Obavijesti kad negativni sentiment prije\u0111e prag", "default_enabled": True},
    {"id": "campaign_budget", "label": "Upozorenja bud\u017eeta kampanje", "description": "Upozori kad potro\u0161nja kampanje dosegne 80% bud\u017eeta", "default_enabled": True},
    {"id": "weekly_report", "label": "Tjedni izvje\u0161taj spreman", "description": "Obavijest kad je tjedni izvje\u0161taj generiran", "default_enabled": True},
    {"id": "mention_spike", "label": "Detekcija porasta spominjanja", "description": "Upozorenje na neuobi\u010dajen obujam spominjanja", "default_enabled": False},
    {"id": "competitor_alert", "label": "Aktivnost konkurencije", "description": "Obavijesti o zna\u010dajnim promjenama konkurencije", "default_enabled": False},
    {"id": "content_approval", "label": "Potrebno odobrenje sadr\u017eaja", "description": "Upozori kad sadr\u017eaj treba odobrenje", "default_enabled": True},
]

# Client getter map
CLIENT_GETTERS = {
    "meta": get_meta_client,
    "tiktok": get_tiktok_client,
    "youtube": get_youtube_client,
    "ga4": get_ga4_client,
    "sports_data": get_sports_data_client,
    "claude": get_claude_client,
    "buffer": get_buffer_client,
    "image_gen": get_image_gen_client,
    "trends": get_trends_client,
}

# Aliases: frontend may send 'sports' but the backend key is 'sports_data'
API_ALIASES = {
    "sports": "sports_data",
    "imagegen": "image_gen",
}


def _resolve_api_name(name: str) -> str:
    """Resolve an alias to the canonical API key."""
    return API_ALIASES.get(name, name)


# ---------- Health ----------

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    checks: dict = {}
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
    api_status = {}
    for name, getter in CLIENT_GETTERS.items():
        client = getter()
        is_mock = getattr(client, "is_mock", None)
        api_status[name] = {
            "mode": "mock" if is_mock else "real",
            "available": client is not None,
        }

    return {
        "status": overall,
        "checks": checks,
        "apis": api_status,
    }


# ---------- API Status (full shape for Settings page) ----------

@router.get("/api-status")
async def get_api_status(db: AsyncSession = Depends(get_db)):
    """Return the full settings payload for the frontend Settings page."""
    from app.services.settings_service import get_all_api_modes, get_all_notification_prefs

    # Get persisted overrides from DB
    persisted_modes = await get_all_api_modes(db)
    notif_prefs = await get_all_notification_prefs(db)

    # Build API list
    apis = []
    for entry in API_CATALOG:
        api_id = entry["id"]
        getter = CLIENT_GETTERS.get(api_id)
        if getter:
            client = getter()
            runtime_mock = getattr(client, "is_mock", True)
        else:
            runtime_mock = True

        # Persisted mode takes precedence, else use runtime
        if api_id in persisted_modes:
            mode = persisted_modes[api_id]
        else:
            mode = "mock" if runtime_mock else "live"

        apis.append({
            "id": api_id,
            "name": entry["name"],
            "description": entry["description"],
            "enabled": True,
            "mode": mode,
            "icon": entry["icon"],
        })

    # Build notification list
    notifications = []
    for entry in NOTIFICATION_CATALOG:
        nid = entry["id"]
        if nid in notif_prefs:
            enabled = notif_prefs[nid]
        else:
            enabled = entry["default_enabled"]
        notifications.append({
            "id": nid,
            "label": entry["label"],
            "description": entry["description"],
            "enabled": enabled,
        })

    # Brand colors
    brand_colors = [
        {"name": "Dinamo plava", "hex": "#0057A8", "usage": "Primarna boja brenda"},
        {"name": "Sidebar tamna", "hex": "#0A1A28", "usage": "Navigacija sidebar"},
        {"name": "Bijela", "hex": "#FFFFFF", "usage": "Pozadina kartica"},
        {"name": "Accent zelena", "hex": "#B8FF00", "usage": "Naglasci i CTA"},
        {"name": "Siva pozadina", "hex": "#F9FAFB", "usage": "Pozadina stranice"},
        {"name": "Tekst tamni", "hex": "#111827", "usage": "Naslovi i tekst"},
    ]

    # System info
    mock_count = sum(1 for a in apis if a["mode"] == "mock")
    system = {
        "version": "1.0.0-beta",
        "environment": "Razvoj",
        "dataMode": f"{mock_count}/{len(apis)} mock" if mock_count < len(apis) else "Sve mock",
        "lastUpdated": time.strftime("%b %d, %Y"),
    }

    return {
        "apis": apis,
        "brandColors": brand_colors,
        "notifications": notifications,
        "system": system,
    }


# ---------- API Toggle ----------

class ApiToggleRequest(BaseModel):
    service: str
    use_mock: bool


@router.put("/api-toggle")
async def toggle_api(
    payload: ApiToggleRequest,
    db: AsyncSession = Depends(get_db),
):
    """Toggle an API between mock and live mode, persisting to DB."""
    from app.services.settings_service import set_api_mode

    api_name = _resolve_api_name(payload.service)

    if api_name not in CLIENT_GETTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Nepoznati API: {api_name}. Dozvoljeni: {list(CLIENT_GETTERS.keys())}",
        )

    new_mode = "mock" if payload.use_mock else "live"

    # Persist to DB
    await set_api_mode(db, api_name, new_mode)

    # Also update the in-memory client if possible
    getter = CLIENT_GETTERS[api_name]
    client = getter()
    if hasattr(client, "set_mock"):
        client.set_mock(payload.use_mock)
    elif hasattr(client, "is_mock"):
        client.is_mock = payload.use_mock

    logger.info("API %s toggled to %s (persisted)", api_name, new_mode)

    return {
        "api": api_name,
        "mode": new_mode,
        "message": f"{api_name} prebačen na {new_mode} način",
    }


# ---------- Notification Toggle ----------

class NotificationToggleRequest(BaseModel):
    id: str
    enabled: bool


@router.put("/notifications/toggle")
async def toggle_notification(
    payload: NotificationToggleRequest,
    db: AsyncSession = Depends(get_db),
):
    """Toggle a notification preference, persisting to DB."""
    from app.services.settings_service import set_notification_enabled

    valid_ids = {n["id"] for n in NOTIFICATION_CATALOG}
    if payload.id not in valid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Nepoznata obavijest: {payload.id}",
        )

    await set_notification_enabled(db, payload.id, payload.enabled)

    label = next((n["label"] for n in NOTIFICATION_CATALOG if n["id"] == payload.id), payload.id)
    status_text = "uključeno" if payload.enabled else "isključeno"
    logger.info("Notification %s set to %s (persisted)", payload.id, payload.enabled)

    return {
        "id": payload.id,
        "enabled": payload.enabled,
        "message": f"{label} {status_text}",
    }


# ---------- Brand ----------

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


# ---------- Notification settings (read) ----------

@router.get("/notifications")
async def get_notification_settings(db: AsyncSession = Depends(get_db)):
    """Return notification settings with persisted overrides from DB."""
    from app.services.settings_service import get_all_notification_prefs

    prefs = await get_all_notification_prefs(db)

    result = []
    for entry in NOTIFICATION_CATALOG:
        nid = entry["id"]
        enabled = prefs[nid] if nid in prefs else entry["default_enabled"]
        result.append({
            "id": nid,
            "label": entry["label"],
            "description": entry["description"],
            "enabled": enabled,
        })
    return result


# ---------- Recent notifications ----------

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
        raise HTTPException(status_code=404, detail="Obavijest nije pronađena")
    notif.is_read = True
    return {"status": "ok"}


# ---------- API Quotas ----------

@router.get("/quotas")
async def get_api_quotas():
    """Get API quota usage for all tracked services."""
    from app.services.quota_tracker import quota_tracker

    return await quota_tracker.get_all_usage()
