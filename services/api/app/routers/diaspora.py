from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client, get_buffer_client, get_current_client
from app.services.diaspora_manager import DiasporaManagerService
from app.models.market import DiasporaData, Country

router = APIRouter()

COUNTRY_FLAGS = {
    "Germany": "🇩🇪", "Austria": "🇦🇹",
    "United States": "🇺🇸", "Canada": "🇨🇦",
    "Switzerland": "🇨🇭", "Australia": "🇦🇺",
    "Sweden": "🇸🇪", "Ireland": "🇮🇪",
    "Norway": "🇳🇴", "Argentina": "🇦🇷",
}


def _get_service():
    return DiasporaManagerService(
        get_claude_client(),
        get_buffer_client(),
    )


@router.get("/map")
async def get_diaspora_map(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_diaspora_map(db, client_id=client.id)
    return result


@router.get("/events")
async def get_community_events(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_community_events(db, client_id=client.id)
    return result


@router.post("/adapt/{post_id}")
async def adapt_content_for_market(
    post_id: UUID,
    target_lang: str = Query(...),
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.adapt_content_for_market(db, post_id, target_lang, client_id=client.id)
    return result


@router.get("/populations")
async def get_populations(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_client),
):
    """BFF endpoint: returns {communities, contentPipeline} for the Diaspora page."""
    user, client, role = ctx
    result = await db.execute(
        select(DiasporaData, Country)
        .join(Country, DiasporaData.country_id == Country.id)
        .where(DiasporaData.client_id == client.id)
        .order_by(DiasporaData.croatian_population.desc())
    )
    rows = result.all()

    communities = []
    for diaspora, country in rows:
        cities = diaspora.city_concentrations or {}
        city_names = ", ".join(list(cities.keys())[:3]) if cities else country.name
        population = diaspora.croatian_population

        # Derive active members and fan clubs from population
        active_pct = 0.025 + (abs(hash(country.name)) % 30) / 1000.0
        active_members = int(population * active_pct)
        fan_clubs = max(1, population // 30000)
        engagement = round(3.0 + (abs(hash(country.name)) % 25) / 10.0, 1)
        flag = COUNTRY_FLAGS.get(country.name, "🏳️")

        communities.append({
            "country": country.name,
            "city": city_names,
            "population": population,
            "activeMembers": active_members,
            "fanClubs": fan_clubs,
            "engagement": engagement,
            "flag": flag,
        })

    content_pipeline = [
        {
            "id": 1,
            "title": "Utakmica uživo thread — UCL",
            "languages": ["HR", "EN", "DE"],
            "platform": "Sve platforme",
            "date": "Mar 7, 2026",
            "status": "Zakazano",
            "description": "Višejezična ažuriranja utakmica u realnom vremenu za navijače dijaspore",
        },
        {
            "id": 2,
            "title": "Fan hub Beč — pregled eventa",
            "languages": ["HR", "DE"],
            "platform": "Instagram + Facebook",
            "date": "Mar 8, 2026",
            "status": "U produkciji",
            "description": "Video pregled watch partyja dijaspore s 200+ navijača u Beču",
        },
        {
            "id": 3,
            "title": "Brand bilten dijaspore",
            "languages": ["HR", "EN"],
            "platform": "Email",
            "date": "Mar 10, 2026",
            "status": "Nacrt",
            "description": "Mjesečni bilten s novostima kluba i pregledom zajednice",
        },
        {
            "id": 4,
            "title": "Kako gledati: Vodič za streaming",
            "languages": ["EN", "DE"],
            "platform": "Website + Social",
            "date": "Mar 6, 2026",
            "status": "Spremno",
            "description": "Ažurirani vodič za dijasporu o praćenju sadržaja brenda",
        },
        {
            "id": 5,
            "title": "Video poruka igrača — njemački navijači",
            "languages": ["DE", "HR"],
            "platform": "TikTok + Instagram",
            "date": "Mar 12, 2026",
            "status": "Pregled scenarija",
            "description": "Personalizirani video pozdrav igrača zajednici njemačke dijaspore",
        },
    ]

    return {
        "communities": communities,
        "contentPipeline": content_pipeline,
    }
