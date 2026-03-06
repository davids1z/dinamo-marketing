import asyncio
import logging
import uuid as uuid_mod

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client, get_image_gen_client, get_publisher
from app.services.content_engine import ContentEngineService
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for async AI generation tasks
_ai_tasks: dict[str, dict] = {}


def _get_service():
    return ContentEngineService(
        get_claude_client(),
        get_image_gen_client(),
    )


async def _run_ai_generation(task_id: str, month: int, year: int):
    """Background coroutine for AI content generation."""
    try:
        from app.integrations.openrouter import generate_content_plan
        api_key = settings.OPENROUTER_API_KEY
        posts = await generate_content_plan(api_key, month, year)
        _ai_tasks[task_id] = {
            "status": "done",
            "posts": posts,
            "month": month,
            "year": year,
            "source": "gemini",
        }
    except Exception as e:
        logger.error(f"OpenRouter AI generation failed: {e}")
        _ai_tasks[task_id] = {
            "status": "error",
            "error": str(e),
            "posts": [],
            "month": month,
            "year": year,
        }


@router.post("/generate-ai-plan")
async def generate_ai_plan(
    month: int = Body(...),
    year: int = Body(...),
):
    """Start async AI content plan generation. Returns task_id to poll."""
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        return {"error": "OPENROUTER_API_KEY not configured", "posts": []}

    task_id = str(uuid_mod.uuid4())
    _ai_tasks[task_id] = {"status": "running", "month": month, "year": year}
    asyncio.create_task(_run_ai_generation(task_id, month, year))

    return {"task_id": task_id, "status": "running"}


@router.get("/generate-ai-plan/{task_id}")
async def get_ai_plan_result(task_id: str):
    """Poll for AI generation result."""
    task = _ai_tasks.get(task_id)
    if not task:
        return {"status": "not_found", "error": "Task not found"}
    return task


@router.post("/generate-plan")
async def generate_monthly_plan(
    month: int = Body(...),
    year: int = Body(...),
    context: dict = Body(default={}),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.generate_monthly_plan(db, month, year, context)
    return result


@router.get("/plans")
async def list_plans(db: AsyncSession = Depends(get_db)):
    from app.models import ContentPlan

    query = select(ContentPlan).order_by(ContentPlan.created_at.desc())
    res = await db.execute(query)
    plans = res.scalars().all()
    return plans


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models import ContentPlan

    query = select(ContentPlan).where(ContentPlan.id == plan_id)
    res = await db.execute(query)
    plan = res.scalar_one_or_none()
    if not plan:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.get("/calendar")
async def get_calendar(
    month: int = Query(...),
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.get_calendar(db, month, year)
    return result


@router.get("/queue")
async def get_approval_queue(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_approval_queue(db)
    return result


@router.patch("/posts/{post_id}/approve")
async def approve_post(post_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.approve_post(db, post_id)
    # Trigger async visual generation via Celery
    try:
        from app.tasks.content_visual import generate_post_visual
        generate_post_visual.delay(str(post_id))
    except Exception as e:
        logger.warning("Could not dispatch visual generation task: %s", e)
    return result


@router.patch("/posts/{post_id}/reject")
async def reject_post(
    post_id: UUID,
    reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.reject_post(db, post_id, reason)
    return result


@router.patch("/posts/{post_id}")
async def update_post(
    post_id: UUID,
    updates: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    from app.models import ContentPost

    query = select(ContentPost).where(ContentPost.id == post_id)
    res = await db.execute(query)
    post = res.scalar_one_or_none()
    if not post:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Post not found")
    for key, value in updates.items():
        if hasattr(post, key):
            setattr(post, key, value)
    await db.commit()
    await db.refresh(post)
    return post


@router.post("/posts/{post_id}/publish")
async def publish_post_now(post_id: UUID, db: AsyncSession = Depends(get_db)):
    """Manually trigger publishing for an approved post."""
    from fastapi import HTTPException
    from app.models.content import ContentPost
    from datetime import datetime, timezone

    query = select(ContentPost).where(ContentPost.id == post_id)
    res = await db.execute(query)
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status not in ("approved", "failed"):
        raise HTTPException(
            status_code=400,
            detail=f"Post must be approved or failed to publish, current status: {post.status}",
        )

    publisher = get_publisher()
    result = await publisher.publish_post(post)

    if result.success:
        post.status = "published"
        post.published_at = datetime.now(timezone.utc)
        post.platform_post_id = result.platform_post_id
        post.platform_post_url = result.platform_post_url
        post.publish_error = None
    else:
        post.publish_attempts += 1
        post.publish_error = result.error
        if post.publish_attempts >= 5:
            post.status = "failed"

    await db.commit()
    await db.refresh(post)

    return {
        "success": result.success,
        "post_id": str(post.id),
        "platform": result.platform,
        "platform_post_id": result.platform_post_id,
        "platform_post_url": result.platform_post_url,
        "error": result.error,
        "status": post.status,
    }


@router.post("/posts/{post_id}/generate-visual")
async def generate_visual(post_id: UUID, db: AsyncSession = Depends(get_db)):
    """Manually trigger visual generation for a post."""
    from fastapi import HTTPException
    from app.models.content import ContentPost
    from app.dependencies import get_content_creator

    query = select(ContentPost).where(ContentPost.id == post_id)
    res = await db.execute(query)
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    creator = get_content_creator()
    result = await creator.generate_visual(post)

    post.visual_url = result["visual_url"]
    await db.commit()
    await db.refresh(post)

    return {
        "post_id": str(post.id),
        "visual_url": result["visual_url"],
        "image_id": result.get("image_id", ""),
        "model": result.get("model", ""),
    }


@router.post("/plans/{plan_id}/generate-visuals")
async def generate_plan_visuals_endpoint(plan_id: UUID):
    """Generate visuals for all posts in a plan (async Celery task)."""
    from app.tasks.content_visual import generate_plan_visuals
    task = generate_plan_visuals.delay(str(plan_id))
    return {"task_id": task.id, "plan_id": str(plan_id), "status": "started"}


@router.get("/templates")
async def list_templates(db: AsyncSession = Depends(get_db)):
    from app.models import ContentTemplate

    query = select(ContentTemplate).order_by(ContentTemplate.created_at.desc())
    res = await db.execute(query)
    templates = res.scalars().all()
    return templates
