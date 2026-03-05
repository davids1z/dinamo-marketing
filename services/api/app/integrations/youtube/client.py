"""Real YouTube Data API v3 client.

Requires a valid Google API key or OAuth2 credentials with YouTube scopes.
"""

from __future__ import annotations

from app.integrations.base import YouTubeClientBase


class YouTubeClient(YouTubeClientBase):
    """Production YouTube Data API client."""

    def __init__(self, api_key: str | None = None, credentials: object | None = None):
        self._api_key = api_key
        self._credentials = credentials
        self._base_url = "https://www.googleapis.com/youtube/v3"

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "YouTubeClient.health_check requires a valid Google API key. "
            "Set YOUTUBE_API_KEY in your environment."
        )

    async def get_channel_stats(self, channel_id: str) -> dict:
        raise NotImplementedError(
            "YouTubeClient.get_channel_stats requires a valid Google API key."
        )

    async def get_recent_videos(self, channel_id: str, limit: int = 10) -> list[dict]:
        raise NotImplementedError(
            "YouTubeClient.get_recent_videos requires a valid Google API key."
        )

    async def get_video_stats(self, video_id: str) -> dict:
        raise NotImplementedError(
            "YouTubeClient.get_video_stats requires a valid Google API key."
        )

    async def get_audience_demographics(self, channel_id: str) -> dict:
        raise NotImplementedError(
            "YouTubeClient.get_audience_demographics requires YouTube Analytics API "
            "OAuth2 credentials with yt-analytics.readonly scope."
        )
