"""Redis caching layer for expensive queries."""

import json
import logging

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def cache_get(key: str):
    """Get cached value by key. Returns None if not found."""
    try:
        r = await get_redis()
        data = await r.get(f"cache:{key}")
        return json.loads(data) if data else None
    except Exception as exc:
        logger.debug("Cache get failed for %s: %s", key, exc)
        return None


async def cache_set(key: str, value, ttl: int):
    """Set cache value with TTL in seconds."""
    try:
        r = await get_redis()
        await r.setex(f"cache:{key}", ttl, json.dumps(value, default=str))
    except Exception as exc:
        logger.debug("Cache set failed for %s: %s", key, exc)


async def cache_invalidate(pattern: str):
    """Invalidate cache keys matching pattern."""
    try:
        r = await get_redis()
        keys = []
        async for key in r.scan_iter(f"cache:{pattern}*"):
            keys.append(key)
        if keys:
            await r.delete(*keys)
            logger.debug("Invalidated %d cache keys matching %s", len(keys), pattern)
    except Exception as exc:
        logger.debug("Cache invalidate failed for %s: %s", pattern, exc)
