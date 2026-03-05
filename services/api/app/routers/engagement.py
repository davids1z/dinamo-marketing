from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client
from app.services.fan_engagement import FanEngagementService

router = APIRouter()


def _get_service():
    return FanEngagementService(get_claude_client())


@router.post("/polls")
async def create_poll(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.create_poll(db, data)
    return result


@router.get("/polls")
async def get_polls(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_polls(db)
    return result


@router.post("/polls/{poll_id}/vote")
async def vote_poll(
    poll_id: UUID,
    option_index: int = Body(...),
    fan_id: UUID = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.vote_poll(db, poll_id, option_index, fan_id)
    return result


@router.post("/ugc")
async def submit_ugc(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.submit_ugc(db, data)
    return result


@router.get("/ugc")
async def get_ugc_submissions(db: AsyncSession = Depends(get_db)):
    from app.models import UGCSubmission

    query = select(UGCSubmission).order_by(UGCSubmission.created_at.desc())
    res = await db.execute(query)
    submissions = res.scalars().all()
    return submissions


@router.get("/leaderboard")
async def get_fan_leaderboard(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_fan_leaderboard(db)
    return result


@router.get("/spotlights")
async def get_spotlights(db: AsyncSession = Depends(get_db)):
    from app.models import FanSpotlight

    query = select(FanSpotlight).order_by(FanSpotlight.created_at.desc())
    res = await db.execute(query)
    spotlights = res.scalars().all()
    return spotlights


@router.post("/spotlights")
async def create_spotlight(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    from app.models import FanSpotlight

    spotlight = FanSpotlight(**data)
    db.add(spotlight)
    await db.commit()
    await db.refresh(spotlight)
    return spotlight
