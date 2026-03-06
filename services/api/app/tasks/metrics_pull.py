"""
Dinamo Marketing Platform - Metrics Pull Task

Pulls metrics from all connected platforms (Meta, TikTok, YouTube) for
published posts, stores results in PostMetric table. Runs every hour
via Celery Beat.
"""

import asyncio
import logging
import random
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Platform metric fetchers (async, using real API clients)
# ---------------------------------------------------------------------------

async def _fetch_meta_metrics(meta_client, post) -> dict:
    """Fetch metrics for an Instagram/Facebook post via Meta API."""
    platform_id = post.platform_post_id
    platform = post.platform

    if platform == "instagram":
        # get_instagram_media returns a list; find our post by ID
        try:
            media_list = await meta_client.get_instagram_media(
                account_id="me", limit=50
            )
            for item in media_list:
                if item.get("id") == platform_id:
                    return {
                        "impressions": item.get("impressions", 0),
                        "reach": item.get("reach", 0),
                        "likes": item.get("like_count", 0),
                        "comments": item.get("comments_count", 0),
                        "shares": 0,
                        "saves": item.get("saved", 0),
                        "engagement_rate": item.get("engagement", 0.0),
                    }
        except Exception:
            pass

    # Fallback: return basic metrics structure
    return {
        "impressions": 0,
        "reach": 0,
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "saves": 0,
        "engagement_rate": 0.0,
    }


async def _fetch_tiktok_metrics(tiktok_client, post) -> dict:
    """Fetch metrics for a TikTok video."""
    try:
        data = await tiktok_client.get_video_insights(post.platform_post_id)
        return {
            "impressions": data.get("views", 0),
            "reach": data.get("views", 0),
            "likes": data.get("likes", 0),
            "comments": data.get("comments", 0),
            "shares": data.get("shares", 0),
            "saves": 0,
            "engagement_rate": data.get("engagement_rate", 0.0),
        }
    except Exception:
        return {"impressions": 0, "reach": 0, "likes": 0, "comments": 0,
                "shares": 0, "saves": 0, "engagement_rate": 0.0}


async def _fetch_youtube_metrics(youtube_client, post) -> dict:
    """Fetch metrics for a YouTube video."""
    try:
        data = await youtube_client.get_video_stats(post.platform_post_id)
        stats = data.get("statistics", data)
        return {
            "impressions": int(stats.get("viewCount", stats.get("views", 0))),
            "reach": int(stats.get("viewCount", stats.get("views", 0))),
            "likes": int(stats.get("likeCount", stats.get("likes", 0))),
            "comments": int(stats.get("commentCount", stats.get("comments", 0))),
            "shares": 0,
            "saves": int(stats.get("favoriteCount", 0)),
            "engagement_rate": 0.0,
        }
    except Exception:
        return {"impressions": 0, "reach": 0, "likes": 0, "comments": 0,
                "shares": 0, "saves": 0, "engagement_rate": 0.0}


# ---------------------------------------------------------------------------
# Mock metric generators (used when mock mode is enabled)
# ---------------------------------------------------------------------------

def _mock_post_metrics(post) -> dict:
    """Generate realistic random metrics for a published post."""
    platform = (post.platform or "").lower()
    base_mult = {"tiktok": 3, "youtube": 2, "instagram": 2, "facebook": 1}.get(platform, 1)
    impressions = random.randint(5_000, 120_000) * base_mult
    reach = int(impressions * random.uniform(0.6, 0.85))
    likes = random.randint(100, 8_000) * base_mult
    comments = random.randint(10, 600)
    shares = random.randint(5, 1_200)
    saves = random.randint(2, 300)
    total_eng = likes + comments + shares + saves
    eng_rate = round((total_eng / reach * 100) if reach > 0 else 0, 2)

    return {
        "impressions": impressions,
        "reach": reach,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "saves": saves,
        "engagement_rate": eng_rate,
    }


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _get_published_posts():
    """Query the database for published posts with platform IDs."""
    from app.database import SyncSessionLocal
    from app.models.content import ContentPost
    from sqlalchemy import select

    with SyncSessionLocal() as db:
        query = (
            select(ContentPost)
            .where(ContentPost.status == "published")
            .where(ContentPost.platform_post_id.isnot(None))
        )
        result = db.execute(query)
        posts = result.scalars().all()

        for post in posts:
            db.expunge(post)
        return posts


def _upsert_post_metric(post_id, metrics: dict):
    """Insert a PostMetric row for the given post."""
    from app.database import SyncSessionLocal
    from app.models.analytics import PostMetric

    with SyncSessionLocal() as db:
        metric = PostMetric(
            post_id=post_id,
            impressions=metrics.get("impressions", 0),
            reach=metrics.get("reach", 0),
            likes=metrics.get("likes", 0),
            comments=metrics.get("comments", 0),
            shares=metrics.get("shares", 0),
            saves=metrics.get("saves", 0),
            clicks=metrics.get("clicks", 0),
            engagement_rate=metrics.get("engagement_rate", 0.0),
            new_followers_attributed=metrics.get("new_followers_attributed", 0),
        )
        db.add(metric)
        db.commit()


# ---------------------------------------------------------------------------
# Async metrics runner
# ---------------------------------------------------------------------------

async def _pull_all_metrics_async(posts, use_mock: bool):
    """Pull metrics for all published posts."""
    from app.dependencies import get_meta_client, get_tiktok_client, get_youtube_client

    meta_client = get_meta_client()
    tiktok_client = get_tiktok_client()
    youtube_client = get_youtube_client()

    results = {
        "posts_processed": 0,
        "platforms": {},
        "errors": [],
    }

    for post in posts:
        platform = (post.platform or "").lower()
        try:
            if use_mock or getattr(meta_client, "is_mock", False):
                metrics = _mock_post_metrics(post)
            else:
                if platform in ("instagram", "facebook"):
                    metrics = await _fetch_meta_metrics(meta_client, post)
                elif platform == "tiktok":
                    metrics = await _fetch_tiktok_metrics(tiktok_client, post)
                elif platform == "youtube":
                    metrics = await _fetch_youtube_metrics(youtube_client, post)
                else:
                    metrics = _mock_post_metrics(post)

            # Store in DB
            _upsert_post_metric(post.id, metrics)
            results["posts_processed"] += 1
            results["platforms"].setdefault(platform, {"success": 0, "failed": 0})
            results["platforms"][platform]["success"] += 1

            logger.info(
                "Pulled metrics for post %s [%s] -- impressions=%s, engagement=%.2f%%",
                post.id, platform,
                metrics.get("impressions", 0),
                metrics.get("engagement_rate", 0),
            )

        except Exception as exc:
            results["platforms"].setdefault(platform, {"success": 0, "failed": 0})
            results["platforms"][platform]["failed"] += 1
            results["errors"].append({"post_id": str(post.id), "error": str(exc)})
            logger.error("Failed to pull metrics for post %s: %s", post.id, exc)

    return results


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.pull_all_metrics",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def pull_all_metrics(self):
    """
    Pull metrics from all platforms for every published post.

    Runs every hour. Queries ContentPost table for published posts,
    fetches metrics from platform APIs (or mock), and stores in
    PostMetric table.
    """
    from app.config import settings

    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Metrics Pull started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "posts_processed": 0,
        "platforms": {},
        "errors": [],
    }

    try:
        # 1. Get published posts from DB
        posts = _get_published_posts()
        if not posts:
            logger.info("  No published posts to pull metrics for")
            return results

        logger.info("  Found %d published posts", len(posts))

        # 2. Pull metrics (async)
        use_mock = settings.DM_USE_MOCK_APIS
        loop = asyncio.new_event_loop()
        try:
            pull_results = loop.run_until_complete(
                _pull_all_metrics_async(posts, use_mock)
            )
        finally:
            loop.close()

        results.update(pull_results)

        # 3. Summary
        logger.info(
            "=== Metrics Pull complete -- posts=%d, errors=%d ===",
            results["posts_processed"],
            len(results["errors"]),
        )

        return results

    except Exception as exc:
        logger.exception("Metrics pull crashed: %s", exc)
        raise self.retry(exc=exc)
