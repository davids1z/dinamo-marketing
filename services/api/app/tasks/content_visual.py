"""Celery tasks for AI visual content generation.

Generates images for content posts using the ContentCreatorService.
Can be triggered on approval or manually via API.
"""

import asyncio
import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _generate_visual_sync(post_id: str) -> dict:
    """Generate a visual for a single post (sync wrapper)."""
    from app.database import SyncSessionLocal
    from app.models.content import ContentPost
    from sqlalchemy import select

    with SyncSessionLocal() as db:
        query = select(ContentPost).where(ContentPost.id == post_id)
        post = db.execute(query).scalar_one_or_none()
        if not post:
            return {"error": f"Post {post_id} not found"}

        if post.visual_url:
            logger.info("Post %s already has visual_url, skipping", post_id)
            return {"skipped": True, "visual_url": post.visual_url}

        # Run async generation in a new event loop
        from app.dependencies import get_content_creator

        creator = get_content_creator()
        db.expunge(post)

    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(creator.generate_visual(post))
    finally:
        loop.close()

    # Update the post with the generated visual URL
    with SyncSessionLocal() as db:
        query = select(ContentPost).where(ContentPost.id == post_id)
        post = db.execute(query).scalar_one_or_none()
        if post:
            post.visual_url = result["visual_url"]
            db.commit()

    return result


@celery_app.task(
    bind=True,
    name="tasks.generate_post_visual",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def generate_post_visual(self, post_id: str):
    """Generate visual for a single post. Called on approval."""
    logger.info("Generating visual for post %s", post_id)
    try:
        result = _generate_visual_sync(post_id)
        logger.info("Visual generation result for %s: %s", post_id, result)
        return result
    except Exception as exc:
        logger.exception("Visual generation failed for post %s: %s", post_id, exc)
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="tasks.generate_plan_visuals",
    max_retries=2,
    default_retry_delay=60,
    acks_late=True,
)
def generate_plan_visuals(self, plan_id: str):
    """Generate visuals for all posts in a plan."""
    from app.database import SyncSessionLocal
    from app.models.content import ContentPost
    from sqlalchemy import select

    logger.info("Generating visuals for plan %s", plan_id)

    with SyncSessionLocal() as db:
        query = (
            select(ContentPost)
            .where(ContentPost.plan_id == plan_id)
            .where(ContentPost.visual_url == "")
        )
        posts = db.execute(query).scalars().all()
        post_ids = [str(p.id) for p in posts]

    results = {
        "plan_id": plan_id,
        "total": len(post_ids),
        "generated": 0,
        "skipped": 0,
        "errors": [],
    }

    for pid in post_ids:
        try:
            result = _generate_visual_sync(pid)
            if result.get("skipped"):
                results["skipped"] += 1
            else:
                results["generated"] += 1
        except Exception as e:
            logger.error("Failed to generate visual for post %s: %s", pid, e)
            results["errors"].append({"post_id": pid, "error": str(e)})

    logger.info("Plan %s visual generation complete: %s", plan_id, results)
    return results
