from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_meta_client, get_claude_client
from app.services.social_listener import SocialListenerService

router = APIRouter()


def _get_service():
    return SocialListenerService(
        get_meta_client(),
        get_claude_client(),
    )


@router.post("/scan")
async def scan_brand_mentions(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.scan_brand_mentions(db)
    return result


@router.get("/trending")
async def get_trending_topics(
    days: int = Query(default=7),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.get_trending_topics(db, days)
    return result


@router.get("/share-of-voice")
async def get_share_of_voice(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_share_of_voice(db)
    return result


@router.get("/crisis")
async def detect_crisis(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.detect_crisis(db)
    return result
