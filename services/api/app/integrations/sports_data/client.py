"""Real sports data API client using API-Football (api-sports.io).

Requires a valid API_FOOTBALL_API_KEY.
Docs: https://www.api-football.com/documentation-v3
"""

from __future__ import annotations

import logging

import httpx

from app.integrations.base import SportsDataClientBase

logger = logging.getLogger(__name__)

API_FOOTBALL_BASE = "https://v3.football.api-sports.io"

# Country code → API-Football country name mapping
COUNTRY_MAP: dict[str, str] = {
    "HR": "Croatia",
    "BA": "Bosnia",
    "RS": "Serbia",
    "SI": "Slovenia",
    "ME": "Montenegro",
    "MK": "Macedonia",
    "XK": "Kosovo",
    "DE": "Germany",
    "AT": "Austria",
    "CH": "Switzerland",
    "SE": "Sweden",
    "NO": "Norway",
    "IE": "Ireland",
    "AU": "Australia",
    "US": "USA",
    "CA": "Canada",
    "GB": "England",
    "TR": "Turkey",
    "NL": "Netherlands",
    "BE": "Belgium",
    "CZ": "Czech-Republic",
    "HU": "Hungary",
    "ES": "Spain",
    "IT": "Italy",
    "FR": "France",
    "PT": "Portugal",
    "PL": "Poland",
}


class SportsDataClient(SportsDataClientBase):
    """Production sports data client using API-Football."""

    def __init__(self, api_key: str, provider: str = "api-football"):
        self._api_key = api_key
        self._provider = provider
        self._base_url = API_FOOTBALL_BASE
        self._headers = {
            "x-apisports-key": api_key,
        }

    async def _get(self, endpoint: str, params: dict | None = None) -> dict:
        """Make a GET request to API-Football."""
        url = f"{self._base_url}/{endpoint}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self._headers, params=params or {})
            response.raise_for_status()
            return response.json()

    async def health_check(self) -> dict:
        """Check API status and remaining quota."""
        data = await self._get("status")
        account = data.get("response", {}).get("account", {})
        requests_info = data.get("response", {}).get("requests", {})
        return {
            "status": "ok",
            "platform": "api-football",
            "mock": False,
            "plan": account.get("plan", "unknown"),
            "requests_today": requests_info.get("current", 0),
            "requests_limit": requests_info.get("limit_day", 0),
        }

    async def get_leagues_by_country(self, country_code: str) -> list[dict]:
        """Get all football leagues for a country."""
        country_name = COUNTRY_MAP.get(country_code, country_code)
        data = await self._get("leagues", {"country": country_name})

        leagues = []
        for item in data.get("response", []):
            league_info = item.get("league", {})
            country_info = item.get("country", {})
            seasons = item.get("seasons", [])
            current_season = next((s for s in seasons if s.get("current")), seasons[-1] if seasons else {})

            leagues.append({
                "league_id": str(league_info.get("id", "")),
                "name": league_info.get("name", ""),
                "country": country_info.get("name", ""),
                "country_code": country_code,
                "season": str(current_season.get("year", "")),
                "logo_url": league_info.get("logo", ""),
                "tier": 1 if league_info.get("type") == "League" else 0,
            })

        logger.info("Found %d leagues for country %s", len(leagues), country_code)
        return leagues

    async def get_events_by_league(self, league_id: str, season: str) -> list[dict]:
        """Get fixtures/events for a league in a given season."""
        data = await self._get("fixtures", {"league": league_id, "season": season})

        events = []
        for item in data.get("response", []):
            fixture = item.get("fixture", {})
            teams = item.get("teams", {})
            goals = item.get("goals", {})
            league = item.get("league", {})

            events.append({
                "event_id": str(fixture.get("id", "")),
                "league_id": league_id,
                "home_team": teams.get("home", {}).get("name", ""),
                "away_team": teams.get("away", {}).get("name", ""),
                "home_team_id": str(teams.get("home", {}).get("id", "")),
                "away_team_id": str(teams.get("away", {}).get("id", "")),
                "date": (fixture.get("date", "") or "")[:10],
                "time": (fixture.get("date", "") or "")[11:16],
                "status": fixture.get("status", {}).get("short", "NS"),
                "home_score": goals.get("home"),
                "away_score": goals.get("away"),
                "venue": (fixture.get("venue", {}) or {}).get("name", ""),
                "round": league.get("round", ""),
            })

        logger.info("Found %d events for league %s season %s", len(events), league_id, season)
        return events

    async def get_team_info(self, team_name: str) -> dict:
        """Search for a team by name."""
        data = await self._get("teams", {"search": team_name})

        results = data.get("response", [])
        if not results:
            return {}

        item = results[0]
        team = item.get("team", {})
        venue = item.get("venue", {})

        return {
            "team_id": str(team.get("id", "")),
            "name": team.get("name", ""),
            "short_name": team.get("code", ""),
            "country": team.get("country", ""),
            "founded": team.get("founded"),
            "venue": venue.get("name", ""),
            "venue_capacity": venue.get("capacity", 0),
            "logo_url": team.get("logo", ""),
            "league": "",
        }

    async def get_upcoming_events(self, team_id: str) -> list[dict]:
        """Get next 10 upcoming fixtures for a team."""
        data = await self._get("fixtures", {"team": team_id, "next": "10"})

        events = []
        for item in data.get("response", []):
            fixture = item.get("fixture", {})
            teams = item.get("teams", {})
            league = item.get("league", {})

            events.append({
                "event_id": str(fixture.get("id", "")),
                "league_id": str(league.get("id", "")),
                "home_team": teams.get("home", {}).get("name", ""),
                "away_team": teams.get("away", {}).get("name", ""),
                "home_team_id": str(teams.get("home", {}).get("id", "")),
                "away_team_id": str(teams.get("away", {}).get("id", "")),
                "date": (fixture.get("date", "") or "")[:10],
                "time": (fixture.get("date", "") or "")[11:16],
                "status": "NS",
                "home_score": None,
                "away_score": None,
                "venue": (fixture.get("venue", {}) or {}).get("name", ""),
                "round": league.get("round", ""),
            })

        return events
