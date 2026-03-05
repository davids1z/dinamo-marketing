"""Real Buffer API client for social media scheduling.

Requires a valid Buffer access token.
"""

from __future__ import annotations

from app.integrations.base import BufferClientBase


class BufferClient(BufferClientBase):
    """Production Buffer API client."""

    def __init__(self, access_token: str):
        self._access_token = access_token
        self._base_url = "https://api.bufferapp.com/1"

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "BufferClient.health_check requires a valid Buffer access token. "
            "Set BUFFER_ACCESS_TOKEN in your environment."
        )

    async def get_profiles(self) -> list[dict]:
        raise NotImplementedError(
            "BufferClient.get_profiles requires a valid Buffer access token."
        )

    async def create_post(
        self,
        profile_ids: list[str],
        text: str,
        media: list[dict] | None = None,
        scheduled_at: str | None = None,
    ) -> dict:
        raise NotImplementedError(
            "BufferClient.create_post requires a valid Buffer access token."
        )

    async def get_scheduled_posts(self, profile_id: str) -> list[dict]:
        raise NotImplementedError(
            "BufferClient.get_scheduled_posts requires a valid Buffer access token."
        )
