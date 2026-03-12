from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import (
    get_current_project, get_meta_client, get_tiktok_client, get_claude_client, get_content_creator,
)
from app.services.campaign_manager import CampaignManagerService

router = APIRouter()


def _get_service():
    return CampaignManagerService(
        get_meta_client(),
        get_tiktok_client(),
        get_claude_client(),
        content_creator=get_content_creator(),
    )


@router.post("/")
async def create_campaign(
    data: dict = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.create_campaign(db, data)
    return result


@router.get("/")
async def list_campaigns(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import Campaign

    query = select(Campaign).where(Campaign.client_id == client.id, Campaign.project_id == project.id).order_by(Campaign.created_at.desc())
    res = await db.execute(query)
    campaigns = res.scalars().all()
    return campaigns


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import Campaign

    query = select(Campaign).where(Campaign.id == campaign_id, Campaign.client_id == client.id, Campaign.project_id == project.id)
    res = await db.execute(query)
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/{campaign_id}/performance")
async def get_campaign_performance(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed performance data with ad-level metrics."""
    user, client, project, role = ctx
    service = _get_service()
    try:
        result = await service.get_campaign_performance(db, campaign_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.pause_campaign(db, campaign_id)
    return result


@router.patch("/{campaign_id}/resume")
async def resume_campaign(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.resume_campaign(db, campaign_id)
    return result


@router.get("/{campaign_id}/ab-test")
async def get_ab_test_results(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.get_ab_test_results(db, campaign_id)
    return result


@router.post("/{campaign_id}/refresh-creative")
async def refresh_creative(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.refresh_creative(db, campaign_id)
    return result
