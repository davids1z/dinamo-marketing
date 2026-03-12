"""Mock image generation client returning placeholder image URLs."""

from __future__ import annotations

import hashlib
from urllib.parse import quote

from app.integrations.base import ImageGenClientBase
from app.integrations.image_gen.types import PLATFORM_SIZES

# Short labels for platform sizes
_SIZE_LABELS = {
    "1024x1024": "Square",
    "1024x1792": "Portrait",
    "1792x1024": "Landscape",
}


class ImageGenMockClient(ImageGenClientBase):
    """Returns placeholder image URLs for development with platform-correct sizes."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "image_gen", "mock": True}

    async def generate_image(self, prompt: str, style: str = "digital-art", size: str = "1024x1024") -> dict:
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:12]
        width, height = size.split("x") if "x" in size else ("1024", "1024")
        size_label = _SIZE_LABELS.get(size, size)

        # Encode a short snippet of the prompt for the placeholder text
        short_prompt = prompt[:40].replace(" ", "+")
        text = quote(f"SOZ+{size_label}")

        return {
            "image_id": f"img_mock_{prompt_hash}",
            "url": f"https://placehold.co/{width}x{height}/0047AB/FFFFFF?text={text}",
            "prompt": prompt,
            "style": style,
            "size": size,
            "created_at": "2026-03-06T10:00:00Z",
            "revised_prompt": (
                f"A {style} style image: {prompt}. "
                "Featuring SOZ Zagreb's iconic blue color scheme with modern design elements."
            ),
            "model": "mock-image-gen-v1",
            "placeholder_alternatives": [
                f"https://placehold.co/{width}x{height}/0047AB/FFFFFF?text=Variant+A",
                f"https://placehold.co/{width}x{height}/1E3A5F/FFFFFF?text=Variant+B",
                f"https://placehold.co/{width}x{height}/003087/B8FF00?text=Variant+C",
            ],
        }
