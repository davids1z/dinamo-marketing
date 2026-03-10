from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_sports_data_client, get_trends_client, get_meta_client
from app.services.market_research import MarketResearchService

router = APIRouter()


def _get_service():
    return MarketResearchService(
        get_sports_data_client(),
        get_trends_client(),
        get_meta_client(),
    )


@router.post("/scan")
async def run_market_scan(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.run_market_scan(db)
    return result


@router.get("/countries")
async def get_all_countries(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_all_countries(db)
    return result


@router.get("/countries/{country_id}")
async def get_country_detail(country_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_country_detail(db, country_id)
    return result


@router.get("/rankings")
async def get_market_rankings(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_market_rankings(db)
    return result


@router.get("/events/{country_code}")
async def get_events_by_country(country_code: str):
    """Get sports events breakdown for a country (leagues + event counts)."""
    service = _get_service()
    result = await service.get_events_by_country(country_code)
    return result
