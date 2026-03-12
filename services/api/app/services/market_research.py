"""Modul 1: Market Intelligence Scanner service."""

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.market import Country, DiasporaData, MarketAudience, MarketScore, SearchTrend, SportEvent

logger = logging.getLogger(__name__)

# Scoring weights
WEIGHTS = {
    "sports_density": 0.25,
    "audience": 0.25,
    "diaspora": 0.20,
    "search": 0.15,
    "social_penetration": 0.15,
}


class MarketResearchService:
    def __init__(self, sports_client, trends_client, meta_client):
        self.sports_client = sports_client
        self.trends_client = trends_client
        self.meta_client = meta_client

    async def scan_all_countries(self, db: AsyncSession) -> list[dict]:
        """Run full market scan for all countries."""
        countries = (await db.execute(select(Country))).scalars().all()
        results = []

        for country in countries:
            score = await self._scan_country(db, country)
            results.append(score)

        # Rank by total score
        results.sort(key=lambda x: x["total_score"], reverse=True)
        for idx, result in enumerate(results):
            result["rank"] = idx + 1

        # Save scores
        for result in results:
            market_score = MarketScore(
                country_id=result["country_id"],
                sports_density_score=result["sports_density_score"],
                audience_score=result["audience_score"],
                diaspora_score=result["diaspora_score"],
                search_score=result["search_score"],
                social_penetration_score=result["social_penetration_score"],
                total_score=result["total_score"],
                rank=result["rank"],
            )
            db.add(market_score)

        await db.flush()
        logger.info(f"Scanned {len(results)} countries")
        return results

    async def get_events_by_country(self, country_code: str) -> dict:
        """Get sports events breakdown for a country."""
        leagues = await self.sports_client.get_leagues_by_country(country_code)
        total_events = 0
        league_details = []

        for league in leagues:
            league_id = league.get("league_id", "")
            season = league.get("season", "2025")
            try:
                events = await self.sports_client.get_events_by_league(league_id, season)
                event_count = len(events)
            except Exception:
                event_count = 0

            total_events += event_count
            league_details.append({
                "league_id": league_id,
                "name": league.get("name", ""),
                "tier": league.get("tier", 0),
                "logo_url": league.get("logo_url", ""),
                "events_count": event_count,
                "season": season,
            })

        return {
            "country_code": country_code,
            "total_events": total_events,
            "total_leagues": len(leagues),
            "leagues": league_details,
        }

    async def _scan_country(self, db: AsyncSession, country: Country) -> dict:
        """Scan a single country and calculate scores."""
        # Get sports data — count actual events per league
        leagues = await self.sports_client.get_leagues_by_country(country.code)
        total_events = 0
        for league in leagues:
            league_id = league.get("league_id", "")
            season = league.get("season", "2025")
            try:
                events = await self.sports_client.get_events_by_league(league_id, season)
                total_events += len(events)
            except Exception:
                total_events += league.get("events_per_year", 0)

        # Inverse: fewer events = easier to break through
        sports_density = max(0, 100 - min(total_events / 10, 100))

        # Get audience data
        audience = (
            await db.execute(
                select(MarketAudience).where(MarketAudience.country_id == country.id)
            )
        ).scalar_one_or_none()
        audience_score = min((audience.football_interest_size / 1_000_000) * 20, 100) if audience else 0

        # Get diaspora data
        diaspora = (
            await db.execute(
                select(DiasporaData).where(DiasporaData.country_id == country.id)
            )
        ).scalar_one_or_none()
        diaspora_score = min((diaspora.croatian_population / 50_000) * 10, 100) if diaspora else 0

        # Get search trends
        trends = await self.trends_client.get_interest_by_region(
            ["Demo Brand"], geo=country.code
        )
        search_score = trends.get("score", 0)

        # Social media penetration
        social_penetration = country.internet_penetration * country.football_popularity_index

        # Calculate total
        total = (
            WEIGHTS["sports_density"] * sports_density
            + WEIGHTS["audience"] * audience_score
            + WEIGHTS["diaspora"] * diaspora_score
            + WEIGHTS["search"] * search_score
            + WEIGHTS["social_penetration"] * social_penetration
        )

        return {
            "country_id": country.id,
            "country_name": country.name,
            "country_code": country.code,
            "region_type": country.region_type,
            "sports_density_score": round(sports_density, 1),
            "audience_score": round(audience_score, 1),
            "diaspora_score": round(diaspora_score, 1),
            "search_score": round(search_score, 1),
            "social_penetration_score": round(social_penetration, 1),
            "total_score": round(total, 1),
            "rank": 0,
        }

    async def run_market_scan(self, db: AsyncSession) -> list[dict]:
        """Alias for scan_all_countries - used by router."""
        return await self.scan_all_countries(db)

    async def get_all_countries(self, db: AsyncSession) -> list[dict]:
        """Get all countries with their latest market scores."""
        result = await db.execute(
            select(Country, MarketScore)
            .outerjoin(MarketScore, MarketScore.country_id == Country.id)
            .order_by(Country.name)
        )
        rows = result.all()
        return [
            {
                "id": str(country.id),
                "name": country.name,
                "code": country.code,
                "region_type": country.region_type,
                "population": country.population,
                "internet_penetration": country.internet_penetration,
                "football_popularity_index": country.football_popularity_index,
                "total_score": score.total_score if score else None,
                "rank": score.rank if score else None,
            }
            for country, score in rows
        ]

    async def get_country_detail(self, db: AsyncSession, country_id: UUID) -> dict:
        """Get detailed info for a single country."""
        country = await db.get(Country, country_id)
        if not country:
            raise ValueError(f"Country {country_id} not found")

        # Get latest score
        score_result = await db.execute(
            select(MarketScore)
            .where(MarketScore.country_id == country_id)
            .order_by(MarketScore.scan_date.desc())
            .limit(1)
        )
        score = score_result.scalar_one_or_none()

        # Get diaspora data
        diaspora = (
            await db.execute(
                select(DiasporaData).where(DiasporaData.country_id == country_id)
            )
        ).scalar_one_or_none()

        # Get audience data
        audience = (
            await db.execute(
                select(MarketAudience).where(MarketAudience.country_id == country_id)
            )
        ).scalar_one_or_none()

        return {
            "id": str(country.id),
            "name": country.name,
            "code": country.code,
            "region_type": country.region_type,
            "population": country.population,
            "internet_penetration": country.internet_penetration,
            "football_popularity_index": country.football_popularity_index,
            "score": {
                "total": score.total_score,
                "sports_density": score.sports_density_score,
                "audience": score.audience_score,
                "diaspora": score.diaspora_score,
                "search": score.search_score,
                "social_penetration": score.social_penetration_score,
                "rank": score.rank,
            } if score else None,
            "diaspora": {
                "croatian_population": diaspora.croatian_population,
                "city_concentrations": diaspora.city_concentrations,
            } if diaspora else None,
            "audience": {
                "football_interest_size": audience.football_interest_size,
                "age_18_24": audience.age_18_24,
                "age_25_34": audience.age_25_34,
                "age_35_44": audience.age_35_44,
                "age_45_plus": audience.age_45_plus,
            } if audience else None,
        }

    async def get_market_rankings(self, db: AsyncSession, limit: int = 5) -> list[dict]:
        """Get top-ranked markets."""
        result = await db.execute(
            select(MarketScore, Country)
            .join(Country, MarketScore.country_id == Country.id)
            .order_by(MarketScore.rank)
            .limit(limit)
        )
        rows = result.all()
        if not rows:
            return [{"message": "No market scores yet. Run /scan first."}]
        return [
            {
                "rank": score.rank,
                "country": country.name,
                "code": country.code,
                "total_score": score.total_score,
                "sports_density": score.sports_density_score,
                "audience": score.audience_score,
                "diaspora": score.diaspora_score,
                "search": score.search_score,
            }
            for score, country in rows
        ]
