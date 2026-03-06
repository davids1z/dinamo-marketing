"""Content Creator Service — orchestrates visual generation for content posts.

Takes a ContentPost, builds an enhanced prompt from visual_brief + brand context,
generates the image via ImageGenClient, saves it via MediaStorageService,
and returns the result.
"""

import logging

from app.integrations.base import ImageGenClientBase
from app.integrations.image_gen.types import PLATFORM_SIZES
from app.services.media_storage import MediaStorageService

logger = logging.getLogger(__name__)

# Dinamo Zagreb brand context injected into every prompt
BRAND_CONTEXT = (
    "GNK Dinamo Zagreb football club. "
    "Brand colors: deep navy (#0A1A28), electric lime (#B8FF00), Dinamo blue (#0057A8). "
    "Maksimir Stadium setting. Blue and white kit. "
    "Professional sports marketing visual, modern and dynamic. "
    "Croatian football culture. No text overlays unless specified."
)

# Map content pillars to style hints
PILLAR_STYLES: dict[str, str] = {
    "match_day": "Action-packed, intense stadium atmosphere, dramatic lighting",
    "match_highlights": "Action-packed, intense stadium atmosphere, dramatic lighting",
    "player_spotlight": "Portrait style, professional athlete photography, sharp focus",
    "behind_scenes": "Candid, documentary style, warm natural lighting",
    "academy": "Youth development, training ground, hopeful and inspiring tone",
    "european_nights": "Epic, cinematic, European football grandeur, floodlights",
    "fan_engagement": "Crowd energy, stadium atmosphere, blue sea of fans",
    "lifestyle": "Lifestyle photography, modern urban, stylish athlete off-field",
    "tactical": "Tactical board, formations, analytical clean design",
}


def _detect_format(post) -> str:
    """Detect content format from post attributes."""
    pillar = (getattr(post, "content_pillar", "") or "").lower()
    visual = (getattr(post, "visual_url", "") or "").lower()

    if any(ext in visual for ext in (".mp4", ".mov", ".avi", ".webm")):
        platform = (getattr(post, "platform", "") or "").lower()
        if platform == "youtube" and "short" in pillar:
            return "short"
        return "reel" if platform == "instagram" else "video"

    if "," in (getattr(post, "visual_url", "") or ""):
        return "carousel"

    return "post"


class ContentCreatorService:
    """Generates visual content for posts using AI image generation."""

    def __init__(
        self,
        image_client: ImageGenClientBase,
        media_storage: MediaStorageService,
    ):
        self._image_client = image_client
        self._media_storage = media_storage

    async def generate_visual(self, post) -> dict:
        """Generate an image for a ContentPost and save it locally.

        Args:
            post: A ContentPost object (or any object with platform,
                  visual_brief, content_pillar, id attributes).

        Returns:
            Dict with ``visual_url`` (serving path) and ``image_id``.
        """
        prompt = self._build_prompt(post)
        platform = (getattr(post, "platform", "") or "").lower()
        fmt = _detect_format(post)
        size_key = f"{platform}_{fmt}"
        size = PLATFORM_SIZES.get(size_key, "1024x1024")

        logger.info(
            "Generating visual for post %s [%s/%s] size=%s",
            getattr(post, "id", "?"), platform, fmt, size,
        )

        result = await self._image_client.generate_image(
            prompt=prompt,
            style="digital-art",
            size=size,
        )

        # Save to local storage
        rel_path = await self._media_storage.save_image(
            image_source=result["url"],
            post_id=str(post.id),
            platform=platform,
        )
        visual_url = self._media_storage.get_url(rel_path)

        logger.info("Visual generated: %s → %s", result.get("image_id"), visual_url)

        return {
            "visual_url": visual_url,
            "image_id": result.get("image_id", ""),
            "model": result.get("model", ""),
            "revised_prompt": result.get("revised_prompt"),
        }

    @staticmethod
    def _build_prompt(post) -> str:
        """Build an enhanced image generation prompt from the post's visual_brief."""
        visual_brief = getattr(post, "visual_brief", "") or ""
        pillar = (getattr(post, "content_pillar", "") or "").lower()
        pillar_style = PILLAR_STYLES.get(pillar, "")

        parts = [BRAND_CONTEXT]
        if pillar_style:
            parts.append(f"Style: {pillar_style}.")
        if visual_brief:
            parts.append(visual_brief)
        else:
            # Fallback: use caption as prompt
            caption = getattr(post, "caption_hr", "") or getattr(post, "caption_en", "") or ""
            if caption:
                parts.append(f"Visual for: {caption[:200]}")

        return " ".join(parts)
