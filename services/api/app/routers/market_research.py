from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_sports_data_client, get_trends_client, get_meta_client, get_current_client
from app.services.market_research import MarketResearchService

router = APIRouter()


def _get_service():
    return MarketResearchService(
        get_sports_data_client(),
        get_trends_client(),
        get_meta_client(),
    )


@router.post("/scan")
async def run_market_scan(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.run_market_scan(db, client_id=client.id)
    return result


@router.get("/countries")
async def get_all_countries(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_all_countries(db, client_id=client.id)
    return result


@router.get("/countries/{country_id}")
async def get_country_detail(
    country_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_country_detail(db, country_id, client_id=client.id)
    return result


@router.get("/rankings")
async def get_market_rankings(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_market_rankings(db, client_id=client.id)
    return result


@router.get("/events/{country_code}")
async def get_events_by_country(
    country_code: str,
    ctx: tuple = Depends(get_current_client),
):
    """Get sports events breakdown for a country (leagues + event counts)."""
    user, client, role = ctx
    service = _get_service()
    result = await service.get_events_by_country(country_code, client_id=client.id)
    return result
