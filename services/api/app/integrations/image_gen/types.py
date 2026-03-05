from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict


class GeneratedImage(TypedDict):
    image_id: str
    url: str
    prompt: str
    style: str
    size: str
    created_at: str
    revised_prompt: str | None
    model: str


class ImageVariation(TypedDict):
    variation_id: str
    url: str
    parent_image_id: str


@dataclass
class ImageGenerationRequest:
    prompt: str
    style: str = "digital-art"
    size: str = "1024x1024"
    quality: str = "standard"
    n: int = 1


@dataclass
class ImageGenerationUsage:
    images_generated: int = 0
    credits_used: float = 0.0
    credits_remaining: float = 0.0
