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

# Platform-specific ad creative sizes
AD_PLATFORM_SIZES: dict[str, str] = {
    "instagram": "1024x1024",     # 1:1 feed ad
    "facebook": "1024x1024",      # 1200x628 ideal but DALL-E uses square
    "tiktok": "1024x1792",        # 9:16 vertical
    "youtube": "1792x1024",       # 16:9 landscape
}

# Platform-specific ad creative style guides
AD_PLATFORM_STYLES: dict[str, str] = {
    "instagram": "Clean, bold typography feel, eye-catching, Instagram feed optimized, square composition, vibrant Dinamo blue and lime accent",
    "facebook": "Informative layout, landscape friendly, professional look, clear messaging hierarchy, suitable for news feed",
    "tiktok": "Trendy vertical format, dynamic and energetic, youth-oriented, fast-paced aesthetic, bold colors and contrast",
    "youtube": "Cinematic wide format, high production value, dramatic lighting, thumbnail-worthy composition",
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

    async def generate_ad_creative(self, campaign, variant: dict, platform: str) -> dict:
        """Generate a platform-specific ad creative visual.

        Args:
            campaign: Campaign object or dict with name, objective.
            variant: Ad variant dict with headline, description, cta.
            platform: Target platform (instagram, facebook, tiktok, youtube).

        Returns:
            Dict with visual_url and image_id.
        """
        prompt = self._build_ad_prompt(campaign, variant, platform)
        size = AD_PLATFORM_SIZES.get(platform, "1024x1024")

        campaign_name = campaign.get("name", "") if isinstance(campaign, dict) else getattr(campaign, "name", "")
        logger.info("Generating ad creative for campaign '%s' [%s] size=%s", campaign_name, platform, size)

        result = await self._image_client.generate_image(
            prompt=prompt,
            style="digital-art",
            size=size,
        )

        campaign_id = campaign.get("id", "ad") if isinstance(campaign, dict) else str(getattr(campaign, "id", "ad"))
        variant_label = variant.get("variant_label", "A")
        rel_path = await self._media_storage.save_image(
            image_source=result["url"],
            post_id=f"ad_{campaign_id}_{variant_label}",
            platform=platform,
        )
        visual_url = self._media_storage.get_url(rel_path)

        return {
            "visual_url": visual_url,
            "image_id": result.get("image_id", ""),
            "model": result.get("model", ""),
            "platform": platform,
            "variant_label": variant_label,
        }

    @staticmethod
    def _build_ad_prompt(campaign, variant: dict, platform: str) -> str:
        """Build an ad-specific image generation prompt."""
        campaign_name = campaign.get("name", "") if isinstance(campaign, dict) else getattr(campaign, "name", "")
        objective = campaign.get("objective", "") if isinstance(campaign, dict) else getattr(campaign, "objective", "")
        headline = variant.get("headline", "")
        description = variant.get("description", "")

        platform_style = AD_PLATFORM_STYLES.get(platform, "")

        parts = [
            BRAND_CONTEXT,
            f"Advertisement for: {campaign_name}.",
            f"Campaign objective: {objective}.",
            f"Headline: {headline}.",
        ]
        if description:
            parts.append(f"Message: {description}.")
        if platform_style:
            parts.append(f"Platform style: {platform_style}.")
        parts.append("Professional sports marketing advertisement, high production value, no readable text in image.")

        return " ".join(parts)

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
