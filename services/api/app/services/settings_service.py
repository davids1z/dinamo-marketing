"""Service for reading and writing platform settings from the database."""

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform_setting import PlatformSetting

logger = logging.getLogger(__name__)

# Category constants
CAT_API_TOGGLE = "api_toggle"
CAT_NOTIFICATION = "notification"

# Key helpers
API_TOGGLE_PREFIX = "api_mode_"
NOTIFICATION_PREFIX = "notif_"


async def get_setting(db: AsyncSession, key: str) -> str | None:
    """Get a single setting value by key."""
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


async def set_setting(
    db: AsyncSession, key: str, value: str, category: str = "general"
) -> PlatformSetting:
    """Upsert a setting by key."""
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.key == key)
    )
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = value
        setting.category = category
    else:
        setting = PlatformSetting(key=key, value=value, category=category)
        db.add(setting)

    await db.flush()
    return setting


async def get_settings_by_category(
    db: AsyncSession, category: str
) -> dict[str, str]:
    """Get all settings for a category as a dict."""
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.category == category)
    )
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


# ---------- API toggle helpers ----------

async def get_api_mode(db: AsyncSession, api_name: str) -> str | None:
    """Get the persisted mode for an API ('mock' or 'live'). None = use default."""
    return await get_setting(db, f"{API_TOGGLE_PREFIX}{api_name}")


async def set_api_mode(db: AsyncSession, api_name: str, mode: str) -> None:
    """Persist the mode for an API."""
    await set_setting(db, f"{API_TOGGLE_PREFIX}{api_name}", mode, CAT_API_TOGGLE)


async def get_all_api_modes(db: AsyncSession) -> dict[str, str]:
    """Get all persisted API modes. Returns {'meta': 'mock', 'tiktok': 'live', ...}."""
    raw = await get_settings_by_category(db, CAT_API_TOGGLE)
    prefix_len = len(API_TOGGLE_PREFIX)
    return {k[prefix_len:]: v for k, v in raw.items()}


# ---------- Notification preference helpers ----------

async def get_notification_enabled(db: AsyncSession, notif_id: str) -> bool | None:
    """Get the persisted enabled state for a notification. None = use default."""
    val = await get_setting(db, f"{NOTIFICATION_PREFIX}{notif_id}")
    if val is None:
        return None
    return val == "true"


async def set_notification_enabled(
    db: AsyncSession, notif_id: str, enabled: bool
) -> None:
    """Persist the enabled state for a notification."""
    await set_setting(
        db,
        f"{NOTIFICATION_PREFIX}{notif_id}",
        "true" if enabled else "false",
        CAT_NOTIFICATION,
    )


async def get_all_notification_prefs(db: AsyncSession) -> dict[str, bool]:
    """Get all persisted notification preferences."""
    raw = await get_settings_by_category(db, CAT_NOTIFICATION)
    prefix_len = len(NOTIFICATION_PREFIX)
    return {k[prefix_len:]: v == "true" for k, v in raw.items()}
