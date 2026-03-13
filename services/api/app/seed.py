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
from app.models.client import Client, UserClient
from app.models.project import Project
from app.services.auth_service import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MOCK_DIR = Path("/app/mock-data")


def load_json(path: str) -> dict:
    with open(MOCK_DIR / path) as f:
        return json.load(f)


async def seed_default_client(session: AsyncSession) -> Client:
    """Create default Demo Brand client if not exists. Returns the client."""
    existing = (await session.execute(
        select(Client).where(Client.slug == "demo-brand")
    )).scalar_one_or_none()
    if existing:
        logger.info("Default client 'Demo Brand' already exists, skipping")
        return existing

    client = Client(
        name="Demo Brand",
        slug="demo-brand",
        is_active=True,
        business_description="Moderna marketinska platforma za demonstraciju mogucnosti sustava.",
        product_info="Digitalni marketing, sadrzaj za drustvene mreze, kampanje",
        tone_of_voice="Profesionalan, moderan, pristupacan publici",
        target_audience="Digitalno osvijesteni korisnici, 18-45 godina",
        brand_colors={
            "primary": "#0A1A28",
            "accent": "#B8FF00",
            "blue": "#0057A8",
        },
        brand_fonts={
            "headline": "Tektur",
            "body": "Inter",
            "code": "JetBrains Mono",
        },
        logo_url="/assets/brand-logo.svg",
        website_url="https://demo-brand.com",
        languages=["hr", "en", "de"],
        content_pillars=[
            {"id": "product", "name": "Proizvod/usluga"},
            {"id": "team_spotlight", "name": "Tim/ljudi"},
            {"id": "behind_scenes", "name": "Iza kulisa"},
            {"id": "community_engagement", "name": "Zajednica"},
            {"id": "education", "name": "Edukacija"},
            {"id": "lifestyle", "name": "Lifestyle"},
            {"id": "campaigns", "name": "Kampanje"},
            {"id": "values", "name": "Vrijednosti"},
        ],
        social_handles={
            "instagram": "@demo_brand",
            "facebook": "Demo Brand",
            "tiktok": "@demo_brand",
            "youtube": "Demo Brand",
        },
        hashtags=["#DemoBrand", "#OurBrand", "#Innovation"],
        ai_system_prompt_override="",
    )
    session.add(client)
    await session.flush()
    logger.info("Seeded default client: Demo Brand (id=%s)", client.id)
    return client


async def seed_default_project(session: AsyncSession, default_client: Client) -> Project:
    """Create default project for the default client if not exists."""
    existing = (await session.execute(
        select(Project).where(Project.client_id == default_client.id, Project.slug == "default")
    )).scalar_one_or_none()
    if existing:
        logger.info("Default project already exists, skipping")
        return existing

    project = Project(
        client_id=default_client.id,
        name="Default",
        slug="default",
        description="Default project for Demo Brand",
        is_active=True,
    )
    session.add(project)
    await session.flush()

    # Mark client as onboarded
    default_client.onboarding_completed = True
    await session.flush()

    logger.info("Seeded default project (id=%s)", project.id)
    return project


async def seed_admin_user(session: AsyncSession, default_client: Client):
    """Create default admin user if not exists, and assign to default client."""
    existing = (await session.execute(
        select(User).where(User.email == "admin@shiftonezero.com")
    )).scalar_one_or_none()
    if existing:
        logger.info("Admin user already exists, skipping")
        # Ensure membership exists
        membership = (await session.execute(
            select(UserClient).where(
                UserClient.user_id == existing.id,
                UserClient.client_id == default_client.id,
            )
        )).scalar_one_or_none()
        if not membership:
            session.add(UserClient(user_id=existing.id, client_id=default_client.id, role="admin"))
            await session.flush()
            logger.info("Added admin user to default client")
        return existing

    admin = User(
        email="admin@shiftonezero.com",
        hashed_password=hash_password("shiftonezero2026"),
        full_name="ShiftOneZero Admin",
        role="admin",
        is_superadmin=True,
        is_active=True,
    )
    session.add(admin)
    await session.flush()

    # Assign admin to default client
    session.add(UserClient(user_id=admin.id, client_id=default_client.id, role="admin"))
    await session.flush()
    logger.info("Seeded admin user: admin@shiftonezero.com (superadmin + client admin)")
    return admin


async def seed_demo_users(session: AsyncSession, default_client: Client):
    """Create demo team members for the default client."""
    demo_users = [
        {"email": "gazda@aseco.hr", "full_name": "Ante Gazda", "password": "gazda123", "role": "admin"},
        {"email": "marko@aseco.hr", "full_name": "Marko Markić", "password": "marko123", "role": "moderator"},
        {"email": "ana@aseco.hr", "full_name": "Ana Anić", "password": "ana123", "role": "moderator"},
    ]

    for u in demo_users:
        existing = (await session.execute(
            select(User).where(User.email == u["email"])
        )).scalar_one_or_none()

        if existing:
            logger.info("Demo user %s already exists, ensuring membership", u["email"])
            user = existing
        else:
            user = User(
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                is_active=True,
                is_superadmin=False,
            )
            session.add(user)
            await session.flush()
            logger.info("Seeded demo user: %s (role=%s)", u["email"], u["role"])

        # Ensure membership
        membership = (await session.execute(
            select(UserClient).where(
                UserClient.user_id == user.id,
                UserClient.client_id == default_client.id,
            )
        )).scalar_one_or_none()
        if not membership:
            session.add(UserClient(user_id=user.id, client_id=default_client.id, role=u["role"]))
            await session.flush()
            logger.info("Added %s to %s as %s", u["email"], default_client.slug, u["role"])


async def seed_countries(session: AsyncSession, client_id):
    """Seed countries from regional, diaspora, expansion JSON files."""
    existing = (await session.execute(select(Country))).scalars().all()
    if existing:
        logger.info(f"Countries already seeded ({len(existing)} rows)")
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
                client_id=client_id,
            )
            session.add(country)
            count += 1

    if countries_inserted:
        await session.flush()
        logger.info(f"Seeded {count} countries")

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
                client_id=client_id,
            )
            session.add(audience)
            audience_count += 1

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
                        croatian_population=entry.get("total_croatians", entry.get("croatian_population", 0)),
                        city_concentrations=city_dict,
                        source="mock-data",
                        year=2025,
                        client_id=client_id,
                    )
                    session.add(d)
                    diaspora_count += 1
    except Exception as e:
        logger.warning(f"Could not load diaspora data: {e}")

    await session.flush()
    logger.info(f"Seeded {audience_count} market audiences, {diaspora_count} diaspora records")


async def seed_competitors(session: AsyncSession, client_id):
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
                client_id=client_id,
            )
            session.add(comp)
            count += 1
        except Exception as e:
            logger.warning(f"Could not load competitor {name}: {e}")

    await session.flush()
    logger.info(f"Seeded {count} competitors")


async def seed_brand_channels(session: AsyncSession, client_id):
    """Seed own brand social channels."""
    existing = (await session.execute(
        select(SocialChannel).where(SocialChannel.owner_type == "own")
    )).scalars().all()
    if existing:
        logger.info(f"Brand channels already seeded ({len(existing)} rows), skipping")
        return

    platforms = {
        "instagram": {"handle": "@demo_brand", "url": "https://instagram.com/demo_brand"},
        "facebook": {"handle": "Demo Brand", "url": "https://facebook.com/demo_brand"},
        "tiktok": {"handle": "@demo_brand", "url": "https://tiktok.com/@demo_brand"},
        "youtube": {"handle": "Demo Brand", "url": "https://youtube.com/@demo_brand"},
    }

    count = 0
    for platform, info in platforms.items():
        channel = SocialChannel(
            owner_type="own",
            owner_id=None,
            platform=platform,
            handle=info["handle"],
            url=info["url"],
            is_primary=True,
            client_id=client_id,
        )
        session.add(channel)
        count += 1

    await session.flush()
    logger.info(f"Seeded {count} brand channels")


async def seed_academy_players(session: AsyncSession, client_id):
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
                client_id=client_id,
            )
            session.add(player)
            count += 1
        await session.flush()
        logger.info(f"Seeded {count} academy players")
    except Exception as e:
        logger.warning(f"Could not seed academy players: {e}")


async def seed_diaspora(session: AsyncSession, client_id):
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
                        client_id=client_id,
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

            # 1. Create default client first
            default_client = await seed_default_client(session)
            client_id = default_client.id

            # 2. Create default project
            default_project = await seed_default_project(session, default_client)

            # 3. Create admin user with client membership
            await seed_admin_user(session, default_client)

            # 3b. Create demo team members
            await seed_demo_users(session, default_client)

            # 4. Seed data (all scoped to default client)
            await seed_countries(session, client_id)
            await seed_diaspora(session, client_id)
            await seed_competitors(session, client_id)
            await seed_brand_channels(session, client_id)
            await seed_academy_players(session, client_id)

        await session.commit()
        logger.info("All seed data committed successfully!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
