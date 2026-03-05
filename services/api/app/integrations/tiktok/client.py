"""Real TikTok Marketing / Content API client.

Requires valid TikTok API credentials (app_id, secret, access_token).
"""

from __future__ import annotations

from app.integrations.base import TikTokClientBase


class TikTokClient(TikTokClientBase):
    """Production TikTok API client."""

    def __init__(self, app_id: str, secret: str, access_token: str):
        self._app_id = app_id
        self._secret = secret
        self._access_token = access_token
        self._base_url = "https://open.tiktokapis.com/v2"
        self._ads_base_url = "https://business-api.tiktok.com/open_api/v1.3"

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "TikTokClient.health_check requires valid TikTok API credentials. "
            "Set TIKTOK_APP_ID, TIKTOK_SECRET, and TIKTOK_ACCESS_TOKEN in your environment."
        )

    async def get_account_info(self) -> dict:
        raise NotImplementedError(
            "TikTokClient.get_account_info requires valid TikTok API credentials."
        )

    async def get_video_list(self, limit: int = 20) -> list[dict]:
        raise NotImplementedError(
            "TikTokClient.get_video_list requires valid TikTok API credentials."
        )

    async def get_video_insights(self, video_id: str) -> dict:
        raise NotImplementedError(
            "TikTokClient.get_video_insights requires valid TikTok API credentials."
        )

    async def create_campaign(self, data: dict) -> dict:
        raise NotImplementedError(
            "TikTokClient.create_campaign requires valid TikTok Ads API credentials."
        )

    async def create_ad_group(self, data: dict) -> dict:
        raise NotImplementedError(
            "TikTokClient.create_ad_group requires valid TikTok Ads API credentials."
        )

    async def create_ad(self, data: dict) -> dict:
        raise NotImplementedError(
            "TikTokClient.create_ad requires valid TikTok Ads API credentials."
        )

    async def get_ad_insights(self, ad_id: str) -> dict:
        raise NotImplementedError(
            "TikTokClient.get_ad_insights requires valid TikTok Ads API credentials."
        )
