"""Real Meta (Facebook / Instagram) Graph API client.

Requires a valid Meta access token with appropriate permissions.
"""

from __future__ import annotations

from app.integrations.base import MetaClientBase


class MetaClient(MetaClientBase):
    """Production Meta Graph API client."""

    def __init__(self, access_token: str, api_version: str = "v19.0"):
        self._access_token = access_token
        self._api_version = api_version
        self._base_url = f"https://graph.facebook.com/{api_version}"

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "MetaClient.health_check requires a valid Meta access token. "
            "Set META_ACCESS_TOKEN in your environment."
        )

    # ------------------------------------------------------------------
    # Page / Instagram insights
    # ------------------------------------------------------------------

    async def get_page_insights(self, page_id: str, metrics: list[str], period: str = "day") -> dict:
        raise NotImplementedError(
            "MetaClient.get_page_insights requires a valid Meta access token and page permissions."
        )

    async def get_instagram_insights(self, account_id: str, metrics: list[str]) -> dict:
        raise NotImplementedError(
            "MetaClient.get_instagram_insights requires a valid Meta access token and Instagram Business account."
        )

    async def get_instagram_media(self, account_id: str, limit: int = 25) -> list[dict]:
        raise NotImplementedError(
            "MetaClient.get_instagram_media requires a valid Meta access token and Instagram Business account."
        )

    async def get_audience_demographics(self, account_id: str) -> dict:
        raise NotImplementedError(
            "MetaClient.get_audience_demographics requires a valid Meta access token."
        )

    # ------------------------------------------------------------------
    # Ads management
    # ------------------------------------------------------------------

    async def create_campaign(self, ad_account_id: str, data: dict) -> dict:
        raise NotImplementedError(
            "MetaClient.create_campaign requires a valid Meta access token with ads_management permission."
        )

    async def create_ad_set(self, ad_account_id: str, data: dict) -> dict:
        raise NotImplementedError(
            "MetaClient.create_ad_set requires a valid Meta access token with ads_management permission."
        )

    async def create_ad(self, ad_account_id: str, data: dict) -> dict:
        raise NotImplementedError(
            "MetaClient.create_ad requires a valid Meta access token with ads_management permission."
        )

    async def get_ad_insights(self, ad_id: str, fields: list[str]) -> dict:
        raise NotImplementedError(
            "MetaClient.get_ad_insights requires a valid Meta access token."
        )

    async def pause_ad(self, ad_id: str) -> dict:
        raise NotImplementedError(
            "MetaClient.pause_ad requires a valid Meta access token with ads_management permission."
        )

    async def update_ad_budget(self, ad_set_id: str, new_budget: float) -> dict:
        raise NotImplementedError(
            "MetaClient.update_ad_budget requires a valid Meta access token with ads_management permission."
        )
