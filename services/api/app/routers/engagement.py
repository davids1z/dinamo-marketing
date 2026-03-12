from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_project, get_claude_client
from app.services.fan_engagement import FanEngagementService

router = APIRouter()


def _get_service():
    return FanEngagementService(get_claude_client())


@router.post("/polls")
async def create_poll(
    data: dict = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.create_poll(db, data)
    return result


@router.get("/polls")
async def get_polls(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.get_polls(db)
    return result


@router.post("/polls/{poll_id}/vote")
async def vote_poll(
    poll_id: UUID,
    option_index: int = Body(...),
    fan_id: UUID = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.vote_poll(db, poll_id, option_index, fan_id)
    return result


@router.post("/ugc")
async def submit_ugc(
    data: dict = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.submit_ugc(db, data)
    return result


@router.get("/ugc")
async def get_ugc_submissions(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import UGCSubmission

    query = select(UGCSubmission).where(UGCSubmission.client_id == client.id, UGCSubmission.project_id == project.id).order_by(UGCSubmission.created_at.desc())
    res = await db.execute(query)
    submissions = res.scalars().all()
    return submissions


@router.get("/leaderboard")
async def get_fan_leaderboard(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.get_fan_leaderboard(db)
    return result


@router.get("/spotlights")
async def get_spotlights(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import FanSpotlight

    query = select(FanSpotlight).where(FanSpotlight.client_id == client.id, FanSpotlight.project_id == project.id).order_by(FanSpotlight.created_at.desc())
    res = await db.execute(query)
    spotlights = res.scalars().all()
    return spotlights


@router.post("/spotlights")
async def create_spotlight(
    data: dict = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import FanSpotlight

    spotlight = FanSpotlight(client_id=client.id, project_id=project.id, **data)
    db.add(spotlight)
    await db.commit()
    await db.refresh(spotlight)
    return spotlight
