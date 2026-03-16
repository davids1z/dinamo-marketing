import asyncio
import logging
import uuid as uuid_mod

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_client, get_current_project, get_claude_client, get_image_gen_client, get_publisher
from app.services.content_engine import ContentEngineService
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for async AI generation tasks
_ai_tasks: dict[str, dict] = {}
_strategy_tasks: dict[str, dict] = {}


def _get_service():
    return ContentEngineService(
        get_claude_client(),
        get_image_gen_client(),
    )


async def _run_ai_generation(task_id: str, month: int, year: int, client_id: str | None = None):
    """Background coroutine for AI content generation with client brand context."""
    try:
        from app.integrations.openrouter import generate_content_plan
        api_key = settings.OPENROUTER_API_KEY

        # Load client for brand context if client_id provided
        client_obj = None
        if client_id:
            try:
                from app.database import async_session_factory
                from app.models.client import Client
                async with async_session_factory() as db:
                    result = await db.execute(
                        select(Client).where(Client.id == client_id)
                    )
                    client_obj = result.scalar_one_or_none()
            except Exception as e:
                logger.warning(f"Could not load client {client_id} for AI context: {e}")

        posts = await generate_content_plan(api_key, month, year, client=client_obj)
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
    ctx: tuple = Depends(get_current_project),
):
    """Start async AI content plan generation. Returns task_id to poll."""
    user, client, project, role = ctx
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        return {"error": "OPENROUTER_API_KEY not configured", "posts": []}

    task_id = str(uuid_mod.uuid4())
    _ai_tasks[task_id] = {"status": "running", "month": month, "year": year}
    # Pass client_id so AI generation uses brand context
    asyncio.create_task(_run_ai_generation(task_id, month, year, client_id=str(client.id)))

    return {"task_id": task_id, "status": "running"}


@router.get("/generate-ai-plan/{task_id}")
async def get_ai_plan_result(
    task_id: str,
    ctx: tuple = Depends(get_current_project),
):
    """Poll for AI generation result."""
    user, client, project, role = ctx
    task = _ai_tasks.get(task_id)
    if not task:
        return {"status": "not_found", "error": "Task not found"}
    return task


@router.post("/generate-plan")
async def generate_monthly_plan(
    month: int = Body(...),
    year: int = Body(...),
    context: dict = Body(default={}),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.generate_monthly_plan(db, month, year, context)
    return result


@router.get("/plans")
async def list_plans(
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import ContentPlan

    base_where = [ContentPlan.client_id == client.id, ContentPlan.project_id == project.id]

    total_result = await db.execute(
        select(func.count(ContentPlan.id)).where(*base_where)
    )
    total = total_result.scalar() or 0

    query = (
        select(ContentPlan)
        .where(*base_where)
        .order_by(ContentPlan.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(query)
    plans = res.scalars().all()
    return {"total": total, "skip": skip, "limit": limit, "items": plans}


@router.get("/plans/{plan_id}")
async def get_plan(
    plan_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import ContentPlan

    query = select(ContentPlan).where(ContentPlan.id == plan_id, ContentPlan.client_id == client.id, ContentPlan.project_id == project.id)
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
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.get_calendar(db, month, year)
    return result


@router.get("/queue")
async def get_approval_queue(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.get_approval_queue(db)
    return result


@router.get("/posts")
async def list_posts(
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
    platform: str | None = Query(default=None, description="Filter by platform"),
    status: str | None = Query(default=None, description="Filter by status"),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """List posts with pagination and optional platform/status filters."""
    from app.models.content import ContentPost

    user, client, project, role = ctx

    conditions = [ContentPost.client_id == client.id, ContentPost.project_id == project.id]
    if platform:
        conditions.append(ContentPost.platform == platform)
    if status:
        conditions.append(ContentPost.status == status)

    total_result = await db.execute(
        select(func.count(ContentPost.id)).where(*conditions)
    )
    total = total_result.scalar() or 0

    query = (
        select(ContentPost)
        .where(*conditions)
        .order_by(ContentPost.scheduled_at.desc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(query)
    posts = res.scalars().all()
    return {"total": total, "skip": skip, "limit": limit, "items": posts}


@router.patch("/posts/{post_id}/approve")
async def approve_post(
    post_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
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
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.reject_post(db, post_id, reason)
    return result


@router.patch("/posts/{post_id}")
async def update_post(
    post_id: UUID,
    updates: dict = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import ContentPost

    query = select(ContentPost).where(ContentPost.id == post_id, ContentPost.client_id == client.id, ContentPost.project_id == project.id)
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



@router.post("/posts")
async def create_post(
    body: dict = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Create a standalone draft ContentPost (e.g. from Campaign Research)."""
    from app.models.content import ContentPost
    from datetime import datetime, timezone, timedelta

    user, client, project, role = ctx

    # Required field — default to instagram if not provided
    platform = body.get("platform", "instagram")
    title = body.get("title", "")

    # scheduled_at: accept ISO string or fall back to 7 days from now
    scheduled_at_raw = body.get("scheduled_at")
    if scheduled_at_raw:
        try:
            scheduled_at = datetime.fromisoformat(scheduled_at_raw.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            scheduled_at = datetime.now(timezone.utc) + timedelta(days=7)
    else:
        scheduled_at = datetime.now(timezone.utc) + timedelta(days=7)

    post = ContentPost(
        client_id=client.id,
        project_id=project.id,
        title=title,
        platform=platform,
        status=body.get("status", "draft"),
        caption_hr=body.get("caption_hr", body.get("body", "")),
        caption_en=body.get("caption_en", ""),
        caption_de=body.get("caption_de", ""),
        content_pillar=body.get("content_pillar", "campaign"),
        scheduled_at=scheduled_at,
        visual_brief=body.get("visual_brief", ""),
        cta_text=body.get("cta_text", ""),
        hashtags=body.get("hashtags"),
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


@router.post("/posts/{post_id}/publish")
async def publish_post_now(
    post_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger publishing for an approved post."""
    user, client, project, role = ctx
    from fastapi import HTTPException
    from app.models.content import ContentPost
    from datetime import datetime, timezone

    query = select(ContentPost).where(ContentPost.id == post_id, ContentPost.client_id == client.id, ContentPost.project_id == project.id)
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
async def generate_visual(
    post_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger visual generation for a post."""
    user, client, project, role = ctx
    from fastapi import HTTPException
    from app.models.content import ContentPost
    from app.dependencies import get_content_creator

    query = select(ContentPost).where(ContentPost.id == post_id, ContentPost.client_id == client.id, ContentPost.project_id == project.id)
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
async def generate_plan_visuals_endpoint(
    plan_id: UUID,
    ctx: tuple = Depends(get_current_project),
):
    """Generate visuals for all posts in a plan (async Celery task)."""
    user, client, project, role = ctx
    from app.tasks.content_visual import generate_plan_visuals
    task = generate_plan_visuals.delay(str(plan_id))
    return {"task_id": task.id, "plan_id": str(plan_id), "status": "started"}


async def _run_strategy_generation(task_id: str, start_month: int, start_year: int, context: dict):
    """Background coroutine for 6-month strategy generation."""
    try:
        from app.database import async_session_factory
        service = _get_service()
        async with async_session_factory() as db:
            result = await service.generate_six_month_strategy(db, start_month, start_year, context)
            _strategy_tasks[task_id] = {
                "status": "done",
                "result": result,
            }
    except Exception as e:
        logger.error("6-month strategy generation failed: %s", e)
        _strategy_tasks[task_id] = {
            "status": "error",
            "error": str(e),
        }


@router.post("/strategy/generate")
async def generate_strategy(
    start_month: int = Body(...),
    start_year: int = Body(...),
    context: dict = Body(default={}),
    ctx: tuple = Depends(get_current_project),
):
    """Start async 6-month content strategy generation. Returns task_id to poll."""
    user, client, project, role = ctx
    task_id = str(uuid_mod.uuid4())
    _strategy_tasks[task_id] = {"status": "running", "start_month": start_month, "start_year": start_year}
    asyncio.create_task(_run_strategy_generation(task_id, start_month, start_year, context))
    return {"task_id": task_id, "status": "running"}


@router.get("/strategy/task/{task_id}")
async def get_strategy_task(
    task_id: str,
    ctx: tuple = Depends(get_current_project),
):
    """Poll for strategy generation result."""
    user, client, project, role = ctx
    task = _strategy_tasks.get(task_id)
    if not task:
        return {"status": "not_found", "error": "Task not found"}
    if task["status"] in ("done", "error"):
        result = dict(task)
        _strategy_tasks.pop(task_id, None)
        return result
    return task


@router.get("/strategy/overview")
async def get_strategy_overview(
    start_month: int = Query(...),
    start_year: int = Query(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Get overview of all plans in a 6-month window."""
    user, client, project, role = ctx
    service = _get_service()
    result = await service.get_strategy_overview(db, start_month, start_year)
    return result


@router.get("/templates")
async def list_templates(
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    from app.models import ContentTemplate

    base_where = [ContentTemplate.client_id == client.id]

    total_result = await db.execute(
        select(func.count(ContentTemplate.id)).where(*base_where)
    )
    total = total_result.scalar() or 0

    query = (
        select(ContentTemplate)
        .where(*base_where)
        .order_by(ContentTemplate.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(query)
    templates = res.scalars().all()
    return {"total": total, "skip": skip, "limit": limit, "items": templates}
