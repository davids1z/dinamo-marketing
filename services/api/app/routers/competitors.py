from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_meta_client, get_youtube_client
from app.services.competitor_intel import CompetitorIntelService

router = APIRouter()


def _get_service():
    return CompetitorIntelService(
        get_meta_client(),
        get_youtube_client(),
    )


@router.post("/scan")
async def scan_all_competitors(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.scan_all_competitors(db)
    return result


@router.get("/")
async def get_competitor_comparison(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_competitor_comparison(db)
    return result


@router.get("/alerts")
async def check_competitor_alerts(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.check_competitor_alerts(db)
    return result
