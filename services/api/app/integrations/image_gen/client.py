"""Real image generation API client (e.g. DALL-E, Stability AI, Midjourney API).

Requires valid API credentials for the chosen image generation provider.
"""

from __future__ import annotations

from app.integrations.base import ImageGenClientBase


class ImageGenClient(ImageGenClientBase):
    """Production image generation API client."""

    def __init__(self, api_key: str, provider: str = "openai"):
        self._api_key = api_key
        self._provider = provider
        if provider == "openai":
            self._base_url = "https://api.openai.com/v1/images"
        elif provider == "stability":
            self._base_url = "https://api.stability.ai/v1/generation"
        else:
            self._base_url = ""

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "ImageGenClient.health_check requires a valid API key. "
            "Set IMAGE_GEN_API_KEY in your environment."
        )

    async def generate_image(self, prompt: str, style: str = "digital-art", size: str = "1024x1024") -> dict:
        raise NotImplementedError(
            "ImageGenClient.generate_image requires a valid API key for the image generation provider."
        )
