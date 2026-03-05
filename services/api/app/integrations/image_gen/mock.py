"""Mock image generation client returning placeholder image URLs."""

from __future__ import annotations

import hashlib

from app.integrations.base import ImageGenClientBase


class ImageGenMockClient(ImageGenClientBase):
    """Returns placeholder image URLs for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "image_gen", "mock": True}

    async def generate_image(self, prompt: str, style: str = "digital-art", size: str = "1024x1024") -> dict:
        # Generate a deterministic ID from the prompt so repeated calls return the same result
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:12]
        width, height = size.split("x") if "x" in size else ("1024", "1024")

        return {
            "image_id": f"img_mock_{prompt_hash}",
            "url": f"https://placehold.co/{width}x{height}/0047AB/FFFFFF?text=Dinamo+Generated+Image",
            "prompt": prompt,
            "style": style,
            "size": size,
            "created_at": "2026-03-05T10:00:00Z",
            "revised_prompt": (
                f"A {style} style image: {prompt}. "
                "Featuring Dinamo Zagreb's iconic blue color scheme with modern design elements."
            ),
            "model": "mock-image-gen-v1",
            "placeholder_alternatives": [
                f"https://placehold.co/{width}x{height}/0047AB/FFFFFF?text=Variant+A",
                f"https://placehold.co/{width}x{height}/1E3A5F/FFFFFF?text=Variant+B",
                f"https://placehold.co/{width}x{height}/003087/FFFFFF?text=Variant+C",
            ],
        }
