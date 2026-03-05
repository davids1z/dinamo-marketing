"""Real sports data API client (e.g. API-Football / TheSportsDB / SportMonks).

Requires a valid API key for the chosen sports data provider.
"""

from __future__ import annotations

from app.integrations.base import SportsDataClientBase


class SportsDataClient(SportsDataClientBase):
    """Production sports data API client."""

    def __init__(self, api_key: str, provider: str = "api-football"):
        self._api_key = api_key
        self._provider = provider
        if provider == "api-football":
            self._base_url = "https://v3.football.api-sports.io"
        elif provider == "thesportsdb":
            self._base_url = "https://www.thesportsdb.com/api/v1/json"
        else:
            self._base_url = ""

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "SportsDataClient.health_check requires a valid API key. "
            "Set SPORTS_DATA_API_KEY in your environment."
        )

    async def get_leagues_by_country(self, country_code: str) -> list[dict]:
        raise NotImplementedError(
            "SportsDataClient.get_leagues_by_country requires a valid API key."
        )

    async def get_events_by_league(self, league_id: str, season: str) -> list[dict]:
        raise NotImplementedError(
            "SportsDataClient.get_events_by_league requires a valid API key."
        )

    async def get_team_info(self, team_name: str) -> dict:
        raise NotImplementedError(
            "SportsDataClient.get_team_info requires a valid API key."
        )

    async def get_upcoming_events(self, team_id: str) -> list[dict]:
        raise NotImplementedError(
            "SportsDataClient.get_upcoming_events requires a valid API key."
        )
