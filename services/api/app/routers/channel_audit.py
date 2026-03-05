from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_meta_client, get_tiktok_client, get_youtube_client, get_ga4_client
from app.services.channel_audit import ChannelAuditService

router = APIRouter()


def _get_service():
    return ChannelAuditService(
        get_meta_client(),
        get_tiktok_client(),
        get_youtube_client(),
        get_ga4_client(),
    )


@router.post("/audit")
async def run_full_audit(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.run_full_audit(db)
    return result


@router.get("/")
async def get_health_scores(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_health_scores(db)
    return result


@router.get("/{channel_id}")
async def audit_channel(channel_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.audit_channel(db, channel_id)
    return result
