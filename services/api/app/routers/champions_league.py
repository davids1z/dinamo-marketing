from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client, get_meta_client
from app.services.cl_surge import CLSurgeService

router = APIRouter()


def _get_service():
    return CLSurgeService(
        get_claude_client(),
        get_meta_client(),
    )


@router.get("/status")
async def check_surge_status(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.check_surge_status(db)
    return result


@router.post("/activate")
async def activate_surge(
    match_date: str = Body(...),
    opponent: str = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.activate_surge(db, match_date, opponent)
    return result


@router.post("/content/{opponent}")
async def generate_pre_match_content(
    opponent: str,
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.generate_pre_match_content(db, opponent)
    return result


@router.post("/boost/{campaign_id}")
async def boost_ad_budget(
    campaign_id: UUID,
    multiplier: float = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.boost_ad_budget(db, campaign_id, multiplier)
    return result
