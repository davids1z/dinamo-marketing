"""Real Google Analytics 4 Data API client.

Requires a valid Google service account or OAuth2 credentials with
Analytics Data API scopes.
"""

from __future__ import annotations

from app.integrations.base import GA4ClientBase


class GA4Client(GA4ClientBase):
    """Production Google Analytics 4 Data API client."""

    def __init__(self, credentials_path: str | None = None, credentials: object | None = None):
        self._credentials_path = credentials_path
        self._credentials = credentials

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "GA4Client.health_check requires valid Google Analytics credentials. "
            "Set GA4_CREDENTIALS_PATH or provide OAuth2 credentials."
        )

    async def get_report(self, property_id: str, metrics: list[str], dimensions: list[str], date_range: dict) -> dict:
        raise NotImplementedError(
            "GA4Client.get_report requires valid Google Analytics credentials."
        )

    async def get_realtime_report(self, property_id: str) -> dict:
        raise NotImplementedError(
            "GA4Client.get_realtime_report requires valid Google Analytics credentials."
        )

    async def get_audience_overview(self, property_id: str, date_range: dict) -> dict:
        raise NotImplementedError(
            "GA4Client.get_audience_overview requires valid Google Analytics credentials."
        )
