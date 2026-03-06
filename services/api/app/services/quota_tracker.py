"""API quota tracking with Redis counters."""

import logging
from datetime import date

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

TRACKED_SERVICES = ["meta", "tiktok", "youtube", "claude", "sports_data", "image_gen"]


class QuotaTracker:
    def __init__(self):
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def increment(self, service: str) -> int:
        """Increment the call count. Returns new daily count."""
        r = await self._get_redis()
        today = date.today().isoformat()
        month = today[:7]
        daily_key = f"quota:{service}:daily:{today}"
        monthly_key = f"quota:{service}:monthly:{month}"

        pipe = r.pipeline()
        pipe.incr(daily_key)
        pipe.expire(daily_key, 86400 * 2)
        pipe.incr(monthly_key)
        pipe.expire(monthly_key, 86400 * 35)
        results = await pipe.execute()
        return results[0]

    async def get_usage(self, service: str) -> dict:
        r = await self._get_redis()
        today = date.today().isoformat()
        month = today[:7]
        daily = await r.get(f"quota:{service}:daily:{today}")
        monthly = await r.get(f"quota:{service}:monthly:{month}")
        limit_attr = f"QUOTA_{service.upper()}_DAILY"
        limit = getattr(settings, limit_attr, 0)
        return {
            "service": service,
            "daily": int(daily) if daily else 0,
            "monthly": int(monthly) if monthly else 0,
            "daily_limit": limit,
        }

    async def get_all_usage(self) -> list[dict]:
        return [await self.get_usage(svc) for svc in TRACKED_SERVICES]

    async def check_quota(self, service: str) -> bool:
        """Returns True if under quota."""
        usage = await self.get_usage(service)
        if usage["daily_limit"] == 0:
            return True
        return usage["daily"] < usage["daily_limit"]


quota_tracker = QuotaTracker()
