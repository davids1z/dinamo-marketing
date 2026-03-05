from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client, get_image_gen_client
from app.services.content_engine import ContentEngineService

router = APIRouter()


def _get_service():
    return ContentEngineService(
        get_claude_client(),
        get_image_gen_client(),
    )


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


@router.get("/templates")
async def list_templates(db: AsyncSession = Depends(get_db)):
    from app.models import ContentTemplate

    query = select(ContentTemplate).order_by(ContentTemplate.created_at.desc())
    res = await db.execute(query)
    templates = res.scalars().all()
    return templates
