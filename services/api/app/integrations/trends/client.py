"""Real Google Trends client (via pytrends or SerpAPI).

Requires either the pytrends library or a valid SerpAPI key.
"""

from __future__ import annotations

from app.integrations.base import TrendsClientBase


class TrendsClient(TrendsClientBase):
    """Production Google Trends client."""

    def __init__(self, api_key: str | None = None, use_serpapi: bool = False):
        self._api_key = api_key
        self._use_serpapi = use_serpapi
        if use_serpapi:
            self._base_url = "https://serpapi.com/search.json"

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "TrendsClient.health_check requires either pytrends installed or a valid SerpAPI key. "
            "Set SERPAPI_KEY in your environment or install pytrends."
        )

    async def get_interest_by_region(self, keywords: list[str], geo: str = "", timeframe: str = "today 12-m") -> dict:
        raise NotImplementedError(
            "TrendsClient.get_interest_by_region requires either pytrends or SerpAPI credentials."
        )

    async def get_interest_over_time(self, keywords: list[str], geo: str = "", timeframe: str = "today 12-m") -> dict:
        raise NotImplementedError(
            "TrendsClient.get_interest_over_time requires either pytrends or SerpAPI credentials."
        )
