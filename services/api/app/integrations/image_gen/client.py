"""Real image generation client — DALL-E 3 (primary) + Stability AI (fallback).

Uses httpx async HTTP calls, consistent with other integration clients.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

import httpx

from app.integrations.base import ImageGenClientBase

logger = logging.getLogger(__name__)

DALLE_URL = "https://api.openai.com/v1/images/generations"
STABILITY_URL = "https://api.stability.ai/v2beta/stable-image/generate/sd3"

# DALL-E 3 only supports these sizes
DALLE_SIZES = {"1024x1024", "1024x1792", "1792x1024"}


class ImageGenClient(ImageGenClientBase):
    """Production image generation client.

    Tries DALL-E 3 first; falls back to Stability AI on failure.
    Constructor signature matches ``dependencies.py`` call.
    """

    def __init__(self, openai_key: str = "", stability_key: str = ""):
        self._openai_key = openai_key
        self._stability_key = stability_key
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    async def health_check(self) -> dict:
        status: dict = {"platform": "image_gen", "mock": False}
        if self._openai_key:
            try:
                client = self._get_client()
                resp = await client.get(
                    "https://api.openai.com/v1/models/dall-e-3",
                    headers={"Authorization": f"Bearer {self._openai_key}"},
                )
                status["openai"] = "ok" if resp.status_code == 200 else f"error:{resp.status_code}"
            except Exception as e:
                status["openai"] = f"error:{e}"
        if self._stability_key:
            try:
                client = self._get_client()
                resp = await client.get(
                    "https://api.stability.ai/v1/engines/list",
                    headers={"Authorization": f"Bearer {self._stability_key}"},
                )
                status["stability"] = "ok" if resp.status_code == 200 else f"error:{resp.status_code}"
            except Exception as e:
                status["stability"] = f"error:{e}"
        status["status"] = "ok" if ("ok" in str(status.get("openai")) or "ok" in str(status.get("stability"))) else "degraded"
        return status

    # ------------------------------------------------------------------
    # Main generation method
    # ------------------------------------------------------------------

    async def generate_image(
        self, prompt: str, style: str = "digital-art", size: str = "1024x1024"
    ) -> dict:
        """Generate an image. Tries DALL-E 3 first, falls back to Stability AI."""
        last_error = None

        if self._openai_key:
            try:
                return await self._generate_dalle(prompt, style, size)
            except Exception as e:
                logger.warning("DALL-E 3 generation failed, trying Stability AI: %s", e)
                last_error = e

        if self._stability_key:
            try:
                return await self._generate_stability(prompt, style, size)
            except Exception as e:
                logger.error("Stability AI generation also failed: %s", e)
                last_error = e

        raise RuntimeError(
            f"Image generation failed. No working provider. Last error: {last_error}"
        )

    # ------------------------------------------------------------------
    # DALL-E 3
    # ------------------------------------------------------------------

    async def _generate_dalle(self, prompt: str, style: str, size: str) -> dict:
        # Clamp to supported size
        dalle_size = size if size in DALLE_SIZES else "1024x1024"

        client = self._get_client()
        resp = await client.post(
            DALLE_URL,
            headers={
                "Authorization": f"Bearer {self._openai_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": dalle_size,
                "style": "vivid" if style in ("vivid", "digital-art") else "natural",
                "quality": "hd",
                "response_format": "url",
            },
        )

        if resp.status_code != 200:
            body = resp.text
            raise RuntimeError(f"DALL-E 3 API error {resp.status_code}: {body[:500]}")

        data = resp.json()["data"][0]
        image_id = f"dalle_{uuid.uuid4().hex[:12]}"

        return {
            "image_id": image_id,
            "url": data["url"],
            "prompt": prompt,
            "style": style,
            "size": dalle_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "revised_prompt": data.get("revised_prompt"),
            "model": "dall-e-3",
        }

    # ------------------------------------------------------------------
    # Stability AI (SD3)
    # ------------------------------------------------------------------

    async def _generate_stability(self, prompt: str, style: str, size: str) -> dict:
        # Parse dimensions for Stability
        try:
            w, h = (int(x) for x in size.split("x"))
        except (ValueError, AttributeError):
            w, h = 1024, 1024

        # Stability supports aspect ratio — map to closest
        aspect = "1:1"
        if w > h:
            aspect = "16:9"
        elif h > w:
            aspect = "9:16"

        client = self._get_client()
        resp = await client.post(
            STABILITY_URL,
            headers={
                "Authorization": f"Bearer {self._stability_key}",
                "Accept": "application/json",
            },
            data={
                "prompt": prompt,
                "aspect_ratio": aspect,
                "output_format": "png",
            },
        )

        if resp.status_code != 200:
            body = resp.text
            raise RuntimeError(f"Stability AI error {resp.status_code}: {body[:500]}")

        result = resp.json()
        image_id = f"stab_{uuid.uuid4().hex[:12]}"

        # Stability returns base64 or URL depending on config
        image_url = result.get("image", "")
        if not image_url.startswith("http"):
            # Base64 returned — store as data URI (will be downloaded by MediaStorageService)
            image_url = f"data:image/png;base64,{image_url}"

        return {
            "image_id": image_id,
            "url": image_url,
            "prompt": prompt,
            "style": style,
            "size": size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "revised_prompt": None,
            "model": "stable-diffusion-3",
        }
