import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select as sa_select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_sports_data_client, get_trends_client, get_meta_client, get_current_client
from app.models.market import Country
from app.services.market_research import MarketResearchService

logger = logging.getLogger(__name__)
router = APIRouter()

# Default markets keyed by language → relevant countries
# Used to auto-seed Country records on first scan
_LANGUAGE_MARKETS: dict[str, list[dict]] = {
    "hr": [
        {"name": "Hrvatska", "code": "HR", "region": "regional", "pop": 3_870_000, "inet": 0.82, "fpi": 0.75},
        {"name": "Bosna i Hercegovina", "code": "BA", "region": "regional", "pop": 3_270_000, "inet": 0.73, "fpi": 0.65},
        {"name": "Srbija", "code": "RS", "region": "regional", "pop": 6_830_000, "inet": 0.78, "fpi": 0.70},
        {"name": "Slovenija", "code": "SI", "region": "regional", "pop": 2_120_000, "inet": 0.87, "fpi": 0.60},
        {"name": "Crna Gora", "code": "ME", "region": "regional", "pop": 620_000, "inet": 0.75, "fpi": 0.55},
    ],
    "en": [
        {"name": "United States", "code": "US", "region": "expansion", "pop": 333_000_000, "inet": 0.92, "fpi": 0.45},
        {"name": "United Kingdom", "code": "GB", "region": "expansion", "pop": 67_000_000, "inet": 0.95, "fpi": 0.85},
        {"name": "Australia", "code": "AU", "region": "expansion", "pop": 26_000_000, "inet": 0.93, "fpi": 0.55},
        {"name": "Canada", "code": "CA", "region": "expansion", "pop": 39_000_000, "inet": 0.93, "fpi": 0.50},
        {"name": "Ireland", "code": "IE", "region": "expansion", "pop": 5_200_000, "inet": 0.92, "fpi": 0.70},
    ],
    "de": [
        {"name": "Njemačka", "code": "DE", "region": "diaspora", "pop": 84_000_000, "inet": 0.93, "fpi": 0.80},
        {"name": "Austrija", "code": "AT", "region": "diaspora", "pop": 9_100_000, "inet": 0.90, "fpi": 0.70},
        {"name": "Švicarska", "code": "CH", "region": "diaspora", "pop": 8_800_000, "inet": 0.96, "fpi": 0.65},
    ],
}

# Fallback if no languages configured
_DEFAULT_MARKETS = [
    {"name": "Hrvatska", "code": "HR", "region": "regional", "pop": 3_870_000, "inet": 0.82, "fpi": 0.75},
    {"name": "Njemačka", "code": "DE", "region": "diaspora", "pop": 84_000_000, "inet": 0.93, "fpi": 0.80},
    {"name": "Austrija", "code": "AT", "region": "diaspora", "pop": 9_100_000, "inet": 0.90, "fpi": 0.70},
    {"name": "United States", "code": "US", "region": "expansion", "pop": 333_000_000, "inet": 0.92, "fpi": 0.45},
    {"name": "United Kingdom", "code": "GB", "region": "expansion", "pop": 67_000_000, "inet": 0.95, "fpi": 0.85},
]


async def _auto_seed_markets(db: AsyncSession, client) -> int:
    """Auto-create Country records based on client languages / profile."""
    languages = client.languages or []
    seen_codes: set[str] = set()
    markets_to_create: list[dict] = []

    for lang in languages:
        lang_key = lang.lower().strip()[:2]
        for m in _LANGUAGE_MARKETS.get(lang_key, []):
            if m["code"] not in seen_codes:
                seen_codes.add(m["code"])
                markets_to_create.append(m)

    if not markets_to_create:
        markets_to_create = _DEFAULT_MARKETS

    created = 0
    for m in markets_to_create:
        # Idempotency: skip if code already exists for client
        existing = await db.execute(
            sa_select(Country).where(
                Country.client_id == client.id,
                Country.code == m["code"],
            )
        )
        if existing.scalar_one_or_none():
            continue

        country = Country(
            name=m["name"],
            code=m["code"],
            region_type=m["region"],
            population=m["pop"],
            internet_penetration=m["inet"],
            football_popularity_index=m["fpi"],
            client_id=client.id,
        )
        db.add(country)
        created += 1

    if created:
        await db.flush()
        logger.info("Auto-seeded %d markets for client %s", created, client.id)

    return created


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

    # Auto-seed markets if none exist
    count_result = await db.execute(
        sa_select(sa_func.count()).select_from(Country).where(Country.client_id == client.id)
    )
    country_count = count_result.scalar() or 0

    if country_count == 0:
        seeded = await _auto_seed_markets(db, client)
        await db.commit()
        logger.info("Seeded %d default markets for client %s, running scan...", seeded, client.id)

    service = _get_service()
    result = await service.run_market_scan(db, client_id=client.id)
    await db.commit()

    return {
        "scanned": len(result),
        "countries": result,
        "message": f"Skenirano {len(result)} tržišta.",
        "hasData": len(result) > 0,
    }


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
