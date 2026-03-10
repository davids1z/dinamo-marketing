"""Seed the database with mock data from JSON files for demo purposes."""

import asyncio
import json
import logging
from datetime import date
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.market import Country, DiasporaData, MarketAudience
from app.models.channel import SocialChannel
from app.models.competitor import Competitor
from app.models.academy import AcademyPlayer
from app.models.user import User
from app.services.auth_service import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MOCK_DIR = Path("/app/mock-data")


def load_json(path: str) -> dict:
    with open(MOCK_DIR / path) as f:
        return json.load(f)


async def seed_admin_user(session: AsyncSession):
    """Create default admin user if not exists."""
    existing = (await session.execute(
        select(User).where(User.email == "admin@shiftonezero.com")
    )).scalar_one_or_none()
    if existing:
        logger.info("Admin user already exists, skipping")
        return
    admin = User(
        email="admin@shiftonezero.com",
        hashed_password=hash_password("shiftonezero2026"),
        full_name="ShiftOneZero Admin",
        role="admin",
        is_active=True,
    )
    session.add(admin)
    await session.flush()
    logger.info("Seeded admin user: admin@shiftonezero.com")


async def seed_countries(session: AsyncSession):
    """Seed countries from regional, diaspora, expansion JSON files."""
    existing = (await session.execute(select(Country))).scalars().all()
    if existing:
        logger.info(f"Countries already seeded ({len(existing)} rows)")
        # Still need to seed audiences/diaspora if they're missing
        existing_audiences = (await session.execute(select(MarketAudience))).scalars().all()
        if existing_audiences:
            logger.info(f"Audiences already seeded ({len(existing_audiences)} rows), skipping countries entirely")
            return
        logger.info("Seeding market audiences for existing countries...")
        countries_inserted = False
    else:
        countries_inserted = True

    count = 0
    for filename, region_type in [
        ("countries/regional.json", "regional"),
        ("countries/diaspora.json", "diaspora"),
        ("countries/expansion.json", "expansion"),
    ]:
        data = load_json(filename)
        countries = data.get("countries", {})
        for code, info in countries.items():
            fp = info.get("football_popularity", {})
            country = Country(
                name=info["name"],
                code=code,
                region_type=region_type,
                population=info.get("population", 0),
                internet_penetration=info.get("internet_penetration", 0) / 100.0,
                football_popularity_index=fp.get("interest_score", 50) / 100.0,
            )
            session.add(country)
            count += 1

    if countries_inserted:
        await session.flush()
        logger.info(f"Seeded {count} countries")

    # Now seed market audiences and diaspora data
    countries = (await session.execute(select(Country))).scalars().all()
    country_map = {c.code: c for c in countries}

    audience_count = 0
    diaspora_count = 0

    for filename in ["countries/regional.json", "countries/diaspora.json", "countries/expansion.json"]:
        data = load_json(filename)
        for code, info in data.get("countries", {}).items():
            if code not in country_map:
                continue
            country = country_map[code]

            # Market audience from platform data
            platforms = info.get("top_platforms", {})
            total_users = 0
            for p in platforms.values():
                if isinstance(p, dict):
                    total_users += p.get("users", 0)
                elif isinstance(p, (int, float)):
                    total_users += int(p)
            audience = MarketAudience(
                country_id=country.id,
                football_interest_size=total_users,
                age_18_24=0.25,
                age_25_34=0.30,
                age_35_44=0.25,
                age_45_plus=0.20,
                mobile_pct=0.72,
                desktop_pct=0.28,
            )
            session.add(audience)
            audience_count += 1

    # Diaspora data
    try:
        diaspora_data = load_json("diaspora_populations.json")
        # Data is in "countries" dict keyed by country code
        countries_dict = diaspora_data.get("countries", {})
        if isinstance(countries_dict, dict):
            for code, entry in countries_dict.items():
                if code in country_map:
                    cities = entry.get("city_concentrations", [])
                    # Convert list of city dicts to a simple dict
                    city_dict = {}
                    if isinstance(cities, list):
                        for c in cities:
                            if isinstance(c, dict):
                                city_dict[c.get("city", "")] = c.get("population", 0)
                    elif isinstance(cities, dict):
                        city_dict = cities
                    d = DiasporaData(
                        country_id=country_map[code].id,
                        croatian_population=entry.get("total_croatians", entry.get("croatian_population", 0)),
                        city_concentrations=city_dict,
                        source="mock-data",
                        year=2025,
                    )
                    session.add(d)
                    diaspora_count += 1
    except Exception as e:
        logger.warning(f"Could not load diaspora data: {e}")

    await session.flush()
    logger.info(f"Seeded {audience_count} market audiences, {diaspora_count} diaspora records")


async def seed_competitors(session: AsyncSession):
    """Seed competitor data."""
    existing = (await session.execute(select(Competitor))).scalars().all()
    if existing:
        logger.info(f"Competitors already seeded ({len(existing)} rows), skipping")
        return

    comp_files = [
        "hajduk", "salzburg", "slavia_praha", "ferencvaros",
        "ajax", "sporting_cp", "galatasaray", "besiktas"
    ]
    count = 0
    for name in comp_files:
        try:
            data = load_json(f"competitors/{name}.json")
            comp = Competitor(
                name=data.get("name", name),
                short_name=data.get("short_name", name),
                country=data.get("country", ""),
                league=data.get("league", ""),
                website=data.get("website", ""),
                logo_url=data.get("logo_url", ""),
            )
            session.add(comp)
            count += 1
        except Exception as e:
            logger.warning(f"Could not load competitor {name}: {e}")

    await session.flush()
    logger.info(f"Seeded {count} competitors")


async def seed_dinamo_channels(session: AsyncSession):
    """Seed Dinamo's social channels."""
    existing = (await session.execute(
        select(SocialChannel).where(SocialChannel.owner_type == "dinamo")
    )).scalars().all()
    if existing:
        logger.info(f"Dinamo channels already seeded ({len(existing)} rows), skipping")
        return

    platforms = {
        "instagram": {"handle": "@gnkdinamo", "url": "https://instagram.com/gnkdinamo"},
        "facebook": {"handle": "GNK Dinamo Zagreb", "url": "https://facebook.com/gnkdinamo"},
        "tiktok": {"handle": "@gnkdinamo", "url": "https://tiktok.com/@gnkdinamo"},
        "youtube": {"handle": "GNK Dinamo", "url": "https://youtube.com/@gnkdinamo"},
    }

    count = 0
    for platform, info in platforms.items():
        channel = SocialChannel(
            owner_type="dinamo",
            owner_id=None,
            platform=platform,
            handle=info["handle"],
            url=info["url"],
            is_primary=True,
        )
        session.add(channel)
        count += 1

    await session.flush()
    logger.info(f"Seeded {count} Dinamo channels")


async def seed_academy_players(session: AsyncSession):
    """Seed academy player data."""
    existing = (await session.execute(select(AcademyPlayer))).scalars().all()
    if existing:
        logger.info(f"Academy players already seeded ({len(existing)} rows), skipping")
        return

    try:
        data = load_json("academy_players.json")
        players = data.get("featured_players", data.get("players", data if isinstance(data, list) else []))
        count = 0
        for p in players[:30]:
            # Extract birth year from date_of_birth or birth_year
            birth_year = p.get("birth_year", 2006)
            dob = p.get("date_of_birth", "")
            if dob and isinstance(dob, str) and "-" in dob:
                try:
                    birth_year = int(dob.split("-")[0])
                except ValueError:
                    pass

            joined_year = p.get("joined_academy", p.get("joined_year", 2020))
            player = AcademyPlayer(
                name=p.get("name", "Unknown"),
                birth_year=birth_year,
                position=p.get("position", ""),
                team_level=p.get("current_team", p.get("team_level", "U19")),
                joined_date=date(joined_year, 7, 1),
                stats=p.get("stats_2025_26", p.get("stats", {})),
                is_featured=True,
            )
            session.add(player)
            count += 1
        await session.flush()
        logger.info(f"Seeded {count} academy players")
    except Exception as e:
        logger.warning(f"Could not seed academy players: {e}")


async def seed_diaspora(session: AsyncSession):
    """Seed diaspora data separately."""
    existing = (await session.execute(select(DiasporaData))).scalars().all()
    if existing:
        logger.info(f"Diaspora already seeded ({len(existing)} rows), skipping")
        return

    countries = (await session.execute(select(Country))).scalars().all()
    country_map = {c.code: c for c in countries}

    count = 0
    try:
        diaspora_data = load_json("diaspora_populations.json")
        countries_dict = diaspora_data.get("countries", {})
        if isinstance(countries_dict, dict):
            for code, entry in countries_dict.items():
                if code in country_map:
                    cities = entry.get("city_concentrations", [])
                    city_dict = {}
                    if isinstance(cities, list):
                        for c in cities:
                            if isinstance(c, dict):
                                city_dict[c.get("city", "")] = c.get("population", 0)
                    elif isinstance(cities, dict):
                        city_dict = cities
                    d = DiasporaData(
                        country_id=country_map[code].id,
                        croatian_population=entry.get("total_croatians", 0),
                        city_concentrations=city_dict,
                        source="mock-data",
                        year=2025,
                    )
                    session.add(d)
                    count += 1
    except Exception as e:
        logger.warning(f"Could not load diaspora data: {e}")

    await session.flush()
    logger.info(f"Seeded {count} diaspora records")


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            # Verify DB connection
            await session.execute(text("SELECT 1"))
            logger.info("Database connection OK")

            await seed_admin_user(session)
            await seed_countries(session)
            await seed_diaspora(session)
            await seed_competitors(session)
            await seed_dinamo_channels(session)
            await seed_academy_players(session)

        await session.commit()
        logger.info("All seed data committed successfully!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
