from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_meta_client, get_tiktok_client, get_claude_client
from app.services.campaign_manager import CampaignManagerService

router = APIRouter()


def _get_service():
    return CampaignManagerService(
        get_meta_client(),
        get_tiktok_client(),
        get_claude_client(),
    )


@router.post("/")
async def create_campaign(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.create_campaign(db, data)
    return result


@router.get("/")
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    from app.models import Campaign

    query = select(Campaign).order_by(Campaign.created_at.desc())
    res = await db.execute(query)
    campaigns = res.scalars().all()
    return campaigns


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models import Campaign

    query = select(Campaign).where(Campaign.id == campaign_id)
    res = await db.execute(query)
    campaign = res.scalar_one_or_none()
    if not campaign:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.patch("/{campaign_id}/pause")
async def pause_campaign(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.pause_campaign(db, campaign_id)
    return result


@router.patch("/{campaign_id}/resume")
async def resume_campaign(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.resume_campaign(db, campaign_id)
    return result


@router.get("/{campaign_id}/ab-test")
async def get_ab_test_results(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_ab_test_results(db, campaign_id)
    return result


@router.post("/{campaign_id}/refresh-creative")
async def refresh_creative(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.refresh_creative(db, campaign_id)
    return result
