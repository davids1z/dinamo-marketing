"""
ShiftOneZero Marketing Platform - Content Publishing Task

Checks the database for approved content scheduled for publishing and
pushes it to the appropriate platforms via the UnifiedPublisher service.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PUBLISH_WINDOW_MINUTES = 10  # Content within +/- 10 min of scheduled time
MAX_PUBLISH_ATTEMPTS = 5     # Max retries per post before marking as failed


# ---------------------------------------------------------------------------
# Database helpers (sync wrapper around async ORM)
# ---------------------------------------------------------------------------

def _get_eligible_posts():
    """Query the database for posts ready to publish."""
    from app.database import SyncSessionLocal
    from app.models.content import ContentPost
    from sqlalchemy import select

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=PUBLISH_WINDOW_MINUTES)
    window_end = now + timedelta(minutes=PUBLISH_WINDOW_MINUTES)

    with SyncSessionLocal() as db:
        query = (
            select(ContentPost)
            .where(ContentPost.status == "approved")
            .where(ContentPost.published_at.is_(None))
            .where(ContentPost.scheduled_at.isnot(None))
            .where(ContentPost.scheduled_at >= window_start)
            .where(ContentPost.scheduled_at <= window_end)
            .where(ContentPost.publish_attempts < MAX_PUBLISH_ATTEMPTS)
        )
        result = db.execute(query)
        posts = result.scalars().all()

        # Detach from session so we can use them outside
        for post in posts:
            db.expunge(post)

        return posts


def _update_post_published(post_id, platform_post_id, platform_post_url):
    """Mark a post as published in the database."""
    from app.database import SyncSessionLocal
    from app.models.content import ContentPost
    from sqlalchemy import select

    with SyncSessionLocal() as db:
        query = select(ContentPost).where(ContentPost.id == post_id)
        post = db.execute(query).scalar_one_or_none()
        if post:
            post.status = "published"
            post.published_at = datetime.now(timezone.utc)
            post.platform_post_id = platform_post_id
            post.platform_post_url = platform_post_url
            post.publish_error = None
            db.commit()


def _update_post_failed(post_id, error_msg):
    """Record a publish failure for a post."""
    from app.database import SyncSessionLocal
    from app.models.content import ContentPost
    from sqlalchemy import select

    with SyncSessionLocal() as db:
        query = select(ContentPost).where(ContentPost.id == post_id)
        post = db.execute(query).scalar_one_or_none()
        if post:
            post.publish_attempts += 1
            post.publish_error = error_msg
            if post.publish_attempts >= MAX_PUBLISH_ATTEMPTS:
                post.status = "failed"
                logger.warning(
                    "Post %s marked as failed after %d attempts",
                    post_id, post.publish_attempts,
                )
            db.commit()


# ---------------------------------------------------------------------------
# Async publish runner
# ---------------------------------------------------------------------------

async def _publish_posts_async(posts):
    """Publish a list of ContentPost objects using the UnifiedPublisher."""
    from app.dependencies import get_publisher

    publisher = get_publisher()
    results = {
        "publish_success": 0,
        "publish_failed": 0,
        "published_items": [],
        "errors": [],
    }

    for post in posts:
        logger.info(
            "Publishing post %s: [%s] %s on %s",
            post.id, post.content_pillar, post.caption_hr[:60], post.platform,
        )

        pub_result = await publisher.publish_post(post)

        if pub_result.success:
            results["publish_success"] += 1
            results["published_items"].append({
                "post_id": str(post.id),
                "platform": pub_result.platform,
                "platform_post_id": pub_result.platform_post_id,
                "platform_post_url": pub_result.platform_post_url,
            })
            _update_post_published(
                post.id,
                pub_result.platform_post_id,
                pub_result.platform_post_url,
            )
            logger.info(
                "  Published to %s -- url=%s",
                pub_result.platform, pub_result.platform_post_url,
            )
        else:
            results["publish_failed"] += 1
            results["errors"].append({
                "post_id": str(post.id),
                "platform": pub_result.platform,
                "error": pub_result.error,
            })
            _update_post_failed(post.id, pub_result.error)
            logger.error(
                "  Failed to publish to %s: %s",
                pub_result.platform, pub_result.error,
            )

    return results


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.publish_scheduled_content",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def publish_scheduled_content(self):
    """
    Check for approved content scheduled for now and publish via
    the UnifiedPublisher.

    Queries ContentPost table for posts with status='approved',
    scheduled_at within the publish window, and not yet published.
    Runs every 5 minutes via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Content Publishing check started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "posts_checked": 0,
        "publish_success": 0,
        "publish_failed": 0,
        "published_items": [],
        "errors": [],
    }

    try:
        # 1. Fetch eligible posts from DB
        posts = _get_eligible_posts()
        results["posts_checked"] = len(posts)

        if not posts:
            logger.info("  No eligible posts to publish")
            return results

        logger.info("  Found %d eligible posts", len(posts))

        # 2. Run async publishing
        loop = asyncio.new_event_loop()
        try:
            pub_results = loop.run_until_complete(_publish_posts_async(posts))
        finally:
            loop.close()

        results.update(pub_results)

        # 3. Summary
        logger.info("=== Content Publishing Complete ===")
        logger.info(
            "  Checked: %d, Published: %d, Failed: %d",
            results["posts_checked"],
            results["publish_success"],
            results["publish_failed"],
        )

        if results["errors"]:
            logger.warning("  Errors: %d", len(results["errors"]))

        return results

    except Exception as exc:
        logger.exception("Content publishing crashed: %s", exc)
        raise self.retry(exc=exc)
