"""Unified Publisher service — routes content to the correct platform API."""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.integrations.base import MetaClientBase, TikTokClientBase, YouTubeClientBase, BufferClientBase
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PublishResult:
    """Outcome of a single publish attempt."""
    success: bool
    platform: str
    platform_post_id: str = ""
    platform_post_url: str = ""
    error: str = ""
    published_at: str = ""


class UnifiedPublisher:
    """Platform-agnostic publishing service.

    Routes each ContentPost to the correct platform API based on
    ``post.platform`` and ``post.content_pillar`` / format hints.
    """

    def __init__(
        self,
        meta_client: MetaClientBase,
        tiktok_client: TikTokClientBase,
        youtube_client: YouTubeClientBase,
        buffer_client: BufferClientBase,
    ):
        self._meta = meta_client
        self._tiktok = tiktok_client
        self._youtube = youtube_client
        self._buffer = buffer_client

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    async def publish_post(self, post) -> PublishResult:
        """Publish a ContentPost to its target platform.

        ``post`` is expected to have at minimum: platform, caption_hr,
        visual_url, hashtags, content_pillar.
        """
        platform = (post.platform or "").lower().strip()
        try:
            match platform:
                case "instagram":
                    return await self._publish_instagram(post)
                case "facebook":
                    return await self._publish_facebook(post)
                case "tiktok":
                    return await self._publish_tiktok(post)
                case "youtube":
                    return await self._publish_youtube(post)
                case _:
                    return PublishResult(
                        success=False,
                        platform=platform,
                        error=f"Unsupported platform: {platform}",
                    )
        except Exception as exc:
            logger.exception("Publish failed for post on %s: %s", platform, exc)
            return PublishResult(
                success=False,
                platform=platform,
                error=str(exc),
            )

    # ------------------------------------------------------------------
    # Instagram
    # ------------------------------------------------------------------

    async def _publish_instagram(self, post) -> PublishResult:
        account_id = settings.META_INSTAGRAM_ACCOUNT_ID
        caption = self._build_caption(post)
        visual = post.visual_url or ""

        # Determine format from content_pillar / visual_url hints
        fmt = self._detect_format(post)

        if fmt == "carousel":
            # Expect visual_url to contain comma-separated URLs
            urls = [u.strip() for u in visual.split(",") if u.strip()]
            if len(urls) < 2:
                urls = [visual, visual]  # fallback
            result = await self._meta.publish_instagram_carousel(account_id, urls, caption)
        elif fmt == "reel":
            result = await self._meta.publish_instagram_reel(account_id, visual, caption)
        else:
            result = await self._meta.publish_instagram_media(account_id, visual, caption)

        post_id = result.get("id", "")
        permalink = result.get("permalink", "")
        return PublishResult(
            success=True,
            platform="instagram",
            platform_post_id=post_id,
            platform_post_url=permalink,
            published_at=datetime.now(timezone.utc).isoformat(),
        )

    # ------------------------------------------------------------------
    # Facebook
    # ------------------------------------------------------------------

    async def _publish_facebook(self, post) -> PublishResult:
        page_id = settings.META_PAGE_ID
        caption = self._build_caption(post)
        visual = post.visual_url or ""
        fmt = self._detect_format(post)

        if fmt in ("reel", "video"):
            result = await self._meta.publish_video(page_id, visual, caption)
        else:
            result = await self._meta.publish_photo(page_id, visual, caption)

        post_id = result.get("id", result.get("post_id", ""))
        url = result.get("url", f"https://www.facebook.com/{page_id}/posts/{post_id}")
        return PublishResult(
            success=True,
            platform="facebook",
            platform_post_id=post_id,
            platform_post_url=url,
            published_at=datetime.now(timezone.utc).isoformat(),
        )

    # ------------------------------------------------------------------
    # TikTok
    # ------------------------------------------------------------------

    async def _publish_tiktok(self, post) -> PublishResult:
        caption = self._build_caption(post)
        visual = post.visual_url or ""
        hashtags = post.hashtags if isinstance(post.hashtags, list) else []

        result = await self._tiktok.publish_video(visual, caption, hashtags)

        pub_id = result.get("publish_id", "")
        share_url = result.get("share_url", "")
        return PublishResult(
            success=True,
            platform="tiktok",
            platform_post_id=pub_id,
            platform_post_url=share_url,
            published_at=datetime.now(timezone.utc).isoformat(),
        )

    # ------------------------------------------------------------------
    # YouTube
    # ------------------------------------------------------------------

    async def _publish_youtube(self, post) -> PublishResult:
        caption = self._build_caption(post)
        visual = post.visual_url or ""
        tags = post.hashtags if isinstance(post.hashtags, list) else []
        title = getattr(post, "cta_text", "") or caption[:100]
        fmt = self._detect_format(post)

        if fmt == "short":
            result = await self._youtube.upload_short(visual, title, caption)
        else:
            result = await self._youtube.upload_video(visual, title, caption, tags)

        vid_id = result.get("id", "")
        url = result.get("url", f"https://www.youtube.com/watch?v={vid_id}")
        return PublishResult(
            success=result.get("success", True),
            platform="youtube",
            platform_post_id=vid_id,
            platform_post_url=url,
            error=result.get("error", ""),
            published_at=datetime.now(timezone.utc).isoformat(),
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_caption(post) -> str:
        """Build the final caption from multilingual captions + hashtags."""
        caption = post.caption_hr or post.caption_en or ""
        if post.hashtags:
            tags = post.hashtags if isinstance(post.hashtags, list) else []
            if tags:
                caption = f"{caption}\n\n{' '.join(tags)}"
        return caption.strip()

    @staticmethod
    def _detect_format(post) -> str:
        """Detect content format from pillar / visual_url hints."""
        pillar = (getattr(post, "content_pillar", "") or "").lower()
        visual = (post.visual_url or "").lower()

        # Video indicators
        if any(ext in visual for ext in (".mp4", ".mov", ".avi", ".webm")):
            if post.platform == "youtube" and "short" in pillar:
                return "short"
            return "reel" if post.platform == "instagram" else "video"

        # Carousel indicators
        if "," in (post.visual_url or ""):
            return "carousel"

        # Default to image post
        return "image"
