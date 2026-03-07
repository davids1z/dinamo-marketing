"""Studio service — business logic for Content Studio operations."""

import logging
import mimetypes
import shutil
import subprocess
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.content import ContentPost
from app.models.media import MediaAsset, StudioProject

logger = logging.getLogger(__name__)


class StudioService:
    """Handles file uploads, project management, and video rendering."""

    def __init__(self, media_root: str = "./media"):
        self._root = Path(media_root)
        self._uploads_dir = self._root / "uploads"
        self._renders_dir = self._root / "renders"
        self._uploads_dir.mkdir(parents=True, exist_ok=True)
        self._renders_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # File Upload
    # ------------------------------------------------------------------

    async def save_upload(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        file_content: bytes,
        original_filename: str,
        mime_type: str,
    ) -> MediaAsset:
        """Save an uploaded file and create a MediaAsset record."""
        post_dir = self._uploads_dir / str(post_id)
        post_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        ext = Path(original_filename).suffix or self._guess_extension(mime_type)
        unique_name = f"{uuid.uuid4().hex[:12]}{ext}"
        file_path = post_dir / unique_name
        file_path.write_bytes(file_content)

        # Determine asset type
        asset_type = "image"
        if mime_type.startswith("video/"):
            asset_type = "video"
        elif mime_type.startswith("audio/"):
            asset_type = "audio"

        # Build URL path
        rel_path = f"uploads/{post_id}/{unique_name}"
        url = f"/media/{rel_path}"

        asset = MediaAsset(
            post_id=post_id,
            filename=unique_name,
            original_filename=original_filename,
            mime_type=mime_type,
            file_size=len(file_content),
            storage_path=rel_path,
            url=url,
            asset_type=asset_type,
            thumbnail_url="",
        )
        db.add(asset)
        await db.commit()
        await db.refresh(asset)

        logger.info("Saved upload: %s → %s (%d bytes)", original_filename, rel_path, len(file_content))
        return asset

    async def list_uploads(self, db: AsyncSession, post_id: uuid.UUID) -> list[MediaAsset]:
        """List all uploaded media assets for a post."""
        query = (
            select(MediaAsset)
            .where(MediaAsset.post_id == post_id)
            .order_by(MediaAsset.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def delete_upload(self, db: AsyncSession, asset_id: uuid.UUID) -> bool:
        """Delete an uploaded media asset."""
        query = select(MediaAsset).where(MediaAsset.id == asset_id)
        result = await db.execute(query)
        asset = result.scalar_one_or_none()
        if not asset:
            return False

        # Delete file from disk
        file_path = self._root / asset.storage_path
        if file_path.exists():
            file_path.unlink()

        await db.delete(asset)
        await db.commit()
        logger.info("Deleted upload: %s", asset.original_filename)
        return True

    # ------------------------------------------------------------------
    # Project CRUD
    # ------------------------------------------------------------------

    async def get_or_create_project(
        self, db: AsyncSession, post_id: uuid.UUID
    ) -> StudioProject:
        """Get existing StudioProject or create a new draft.

        When creating a NEW project, auto-populates the brief, caption,
        and hashtags from the linked ContentPost so the studio opens
        ready for AI generation.
        """
        query = select(StudioProject).where(StudioProject.post_id == post_id)
        result = await db.execute(query)
        project = result.scalar_one_or_none()

        if project:
            return project

        # Try to load ContentPost for auto-populating brief
        post_query = select(ContentPost).where(ContentPost.id == post_id)
        post_result = await db.execute(post_query)
        post = post_result.scalar_one_or_none()

        # --- Auto-populate brief from ContentPost data (if available) ---
        if post:
            brief = self._build_brief_from_post(post)
            initial_caption = post.caption_hr or ""
            initial_hashtags = post.hashtags if isinstance(post.hashtags, list) else None
            initial_description = post.visual_brief or ""
        else:
            # Mock/frontend-only post — create with empty defaults
            # Frontend will supply brief via session state or manual entry
            logger.info("ContentPost %s not found in DB — creating studio project with defaults", post_id)
            brief = ""
            initial_caption = ""
            initial_hashtags = None
            initial_description = ""

        project = StudioProject(
            post_id=post_id,
            brief=brief,
            scene_data=None,
            generated_caption=initial_caption,
            generated_hashtags=initial_hashtags,
            generated_description=initial_description,
            output_url="",
            output_type="",
            status="draft",
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

        logger.info("Created studio project for post %s with auto-brief (%d chars)", post_id, len(brief))
        return project

    async def update_project(
        self, db: AsyncSession, post_id: uuid.UUID, updates: dict
    ) -> StudioProject:
        """Update project fields."""
        query = select(StudioProject).where(StudioProject.post_id == post_id)
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Studio project for post {post_id} not found")

        allowed_fields = {
            "brief", "scene_data", "generated_caption", "generated_hashtags",
            "generated_description", "output_url", "output_type", "status",
        }
        for key, value in updates.items():
            if key in allowed_fields:
                setattr(project, key, value)

        await db.commit()
        await db.refresh(project)
        return project

    # ------------------------------------------------------------------
    # AI Scene Generation
    # ------------------------------------------------------------------

    async def generate_scenes(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        brief: str,
    ) -> dict:
        """Generate AI scenes for a post. Returns the scene data dict."""
        from app.integrations.openrouter_studio import generate_studio_scenes

        # Get post details (may not exist for mock/frontend posts)
        post_query = select(ContentPost).where(ContentPost.id == post_id)
        post_result = await db.execute(post_query)
        post = post_result.scalar_one_or_none()

        # Get uploaded media descriptions
        uploads = await self.list_uploads(db, post_id)
        media_descriptions = []
        for asset in uploads:
            desc = f"{asset.asset_type}: {asset.original_filename} ({asset.mime_type})"
            if asset.url:
                desc += f" — URL: {asset.url}"
            media_descriptions.append(desc)

        # Update project status
        project = await self.get_or_create_project(db, post_id)
        project.brief = brief
        project.status = "generating"
        await db.commit()

        # Determine content type from post or brief
        content_type = self._detect_content_type(post) if post else self._detect_content_type_from_brief(brief)

        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        try:
            scene_data = await generate_studio_scenes(
                api_key=api_key,
                brief=brief,
                post_title=post.title if post else brief.split("\n")[0][:60],
                platform=post.platform if post else "instagram",
                content_type=content_type,
                media_descriptions=media_descriptions if media_descriptions else None,
            )

            # Save to project
            project.scene_data = scene_data.get("scenes", [])
            project.generated_caption = scene_data.get("caption", "")
            project.generated_hashtags = scene_data.get("hashtags", [])
            project.generated_description = scene_data.get("description", "")
            project.status = "generated"
            await db.commit()
            await db.refresh(project)

            return scene_data

        except Exception as e:
            project.status = "draft"
            await db.commit()
            logger.error("AI scene generation failed: %s", e)
            raise

    # ------------------------------------------------------------------
    # Video Rendering (WebM → MP4 via FFmpeg)
    # ------------------------------------------------------------------

    async def render_video(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        webm_content: bytes,
    ) -> str:
        """Convert uploaded WebM to MP4 via FFmpeg. Returns the output URL."""
        project = await self.get_or_create_project(db, post_id)
        project.status = "rendering"
        await db.commit()

        render_dir = self._renders_dir / str(post_id)
        render_dir.mkdir(parents=True, exist_ok=True)

        input_path = render_dir / f"{uuid.uuid4().hex[:8]}.webm"
        output_name = f"{uuid.uuid4().hex[:8]}.mp4"
        output_path = render_dir / output_name

        # Save WebM
        input_path.write_bytes(webm_content)

        try:
            # FFmpeg conversion
            cmd = [
                "ffmpeg", "-y",
                "-i", str(input_path),
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                str(output_path),
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode != 0:
                logger.error("FFmpeg failed: %s", result.stderr)
                project.status = "generated"
                await db.commit()
                raise RuntimeError(f"FFmpeg conversion failed: {result.stderr[:500]}")

            # Update project
            rel_path = f"renders/{post_id}/{output_name}"
            output_url = f"/media/{rel_path}"

            project.output_url = output_url
            project.output_type = "video"
            project.status = "rendered"
            await db.commit()
            await db.refresh(project)

            # Clean up WebM
            input_path.unlink(missing_ok=True)

            logger.info("Rendered video: %s", output_url)
            return output_url

        except subprocess.TimeoutExpired:
            project.status = "generated"
            await db.commit()
            raise RuntimeError("FFmpeg conversion timed out")

    # ------------------------------------------------------------------
    # Image Export (save client-side generated PNG)
    # ------------------------------------------------------------------

    async def save_export(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        image_content: bytes,
        filename: str = "export.png",
    ) -> str:
        """Save an exported image from the client. Returns the output URL."""
        project = await self.get_or_create_project(db, post_id)

        render_dir = self._renders_dir / str(post_id)
        render_dir.mkdir(parents=True, exist_ok=True)

        output_name = f"{uuid.uuid4().hex[:8]}_{filename}"
        output_path = render_dir / output_name
        output_path.write_bytes(image_content)

        rel_path = f"renders/{post_id}/{output_name}"
        output_url = f"/media/{rel_path}"

        project.output_url = output_url
        project.output_type = "image"
        project.status = "rendered"
        await db.commit()
        await db.refresh(project)

        logger.info("Saved export: %s (%d bytes)", output_url, len(image_content))
        return output_url

    # ------------------------------------------------------------------
    # Publish
    # ------------------------------------------------------------------

    async def publish(
        self, db: AsyncSession, post_id: uuid.UUID, target_platform: str | None = None
    ) -> dict:
        """Publish content — routes to Telegram or UnifiedPublisher.

        Args:
            target_platform: Override platform. Use 'telegram' for test publishing.
        """
        from datetime import datetime, timezone

        project_q = select(StudioProject).where(StudioProject.post_id == post_id)
        project_res = await db.execute(project_q)
        project = project_res.scalar_one_or_none()
        if not project:
            raise ValueError("No studio project found for this post")

        if not project.output_url:
            raise ValueError("No rendered output to publish. Export or render first.")

        # Get the post
        post_q = select(ContentPost).where(ContentPost.id == post_id)
        post_res = await db.execute(post_q)
        post = post_res.scalar_one_or_none()
        if not post:
            raise ValueError(f"Post {post_id} not found")

        # Build caption with hashtags
        caption = project.generated_caption or post.caption_hr or post.title or ""
        hashtags = project.generated_hashtags or post.hashtags or []
        if isinstance(hashtags, list) and hashtags:
            caption = f"{caption}\n\n{' '.join(hashtags)}"

        # Resolve output file path
        output_file = None
        if project.output_url and not project.output_url.startswith("http"):
            # It's a local /media/ path
            local_path = self._root / project.output_url.lstrip("/media/").lstrip("/")
            if local_path.exists():
                output_file = str(local_path)
            else:
                # Try absolute from media root
                rel = project.output_url.replace("/media/", "", 1)
                alt_path = self._root / rel
                if alt_path.exists():
                    output_file = str(alt_path)

        platform = (target_platform or post.platform or "").lower().strip()

        # ----- TELEGRAM (test publishing) -----
        if platform == "telegram":
            return await self._publish_telegram(
                db, post, project, caption, output_file
            )

        # ----- Standard platforms via UnifiedPublisher -----
        from app.dependencies import get_publisher

        base_url = settings.CORS_ORIGINS.split(",")[0].strip()
        full_output_url = project.output_url
        if not full_output_url.startswith("http"):
            full_output_url = f"{base_url}{full_output_url}"

        post.visual_url = full_output_url
        if project.generated_caption:
            post.caption_hr = project.generated_caption
        if project.generated_hashtags:
            post.hashtags = project.generated_hashtags
        post.status = "approved"
        await db.commit()

        publisher = get_publisher()
        result = await publisher.publish_post(post)

        if result.success:
            post.status = "published"
            post.published_at = datetime.now(timezone.utc)
            post.platform_post_id = result.platform_post_id
            post.platform_post_url = result.platform_post_url
            post.publish_error = None
            project.status = "published"
        else:
            post.publish_attempts += 1
            post.publish_error = result.error
            if post.publish_attempts >= 5:
                post.status = "failed"

        await db.commit()
        await db.refresh(post)

        return {
            "success": result.success,
            "post_id": str(post.id),
            "platform": result.platform,
            "platform_post_id": result.platform_post_id,
            "platform_post_url": result.platform_post_url,
            "error": result.error,
            "status": post.status,
        }

    async def _publish_telegram(
        self, db, post, project, caption: str, output_file: str | None,
    ) -> dict:
        """Publish to Telegram channel via Bot API."""
        from datetime import datetime, timezone
        from app.integrations.telegram import TelegramPublisher

        bot_token = settings.TELEGRAM_BOT_TOKEN
        channel_id = settings.TELEGRAM_CHANNEL_ID

        if not bot_token or not channel_id:
            return {
                "success": False,
                "post_id": str(post.id),
                "platform": "telegram",
                "platform_post_id": "",
                "platform_post_url": "",
                "error": "TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID must be configured in .env",
                "status": post.status,
            }

        tg = TelegramPublisher(bot_token, channel_id)

        try:
            # Determine if it's a photo or video
            output_type = project.output_type or "image"

            if output_file and output_type == "image":
                result = await tg.send_photo_file(output_file, caption)
            elif output_file and output_type == "video":
                result = await tg.send_video_file(output_file, caption)
            else:
                # Fallback: send as text with URL
                text = caption
                if project.output_url:
                    text += f"\n\n📷 {project.output_url}"
                result = await tg.send_message(text)

            # Extract message link
            msg_id = result.get("message_id", "")
            # For public channels, construct the link
            clean_channel = channel_id.lstrip("@").lstrip("-100")
            post_url = f"https://t.me/{clean_channel}/{msg_id}" if msg_id else ""

            # Update post status
            post.status = "published"
            post.published_at = datetime.now(timezone.utc)
            post.platform_post_id = str(msg_id)
            post.platform_post_url = post_url
            post.publish_error = None
            project.status = "published"
            await db.commit()
            await db.refresh(post)

            logger.info("Published to Telegram: %s", post_url)

            return {
                "success": True,
                "post_id": str(post.id),
                "platform": "telegram",
                "platform_post_id": str(msg_id),
                "platform_post_url": post_url,
                "error": "",
                "status": "published",
            }

        except Exception as e:
            logger.error("Telegram publish failed: %s", e)
            post.publish_attempts = (post.publish_attempts or 0) + 1
            post.publish_error = str(e)
            await db.commit()

            return {
                "success": False,
                "post_id": str(post.id),
                "platform": "telegram",
                "platform_post_id": "",
                "platform_post_url": "",
                "error": str(e),
                "status": post.status,
            }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _guess_extension(mime_type: str) -> str:
        """Guess file extension from MIME type."""
        ext = mimetypes.guess_extension(mime_type) or ""
        # Fix common quirks
        if ext == ".jpe":
            ext = ".jpg"
        return ext

    @staticmethod
    def _build_brief_from_post(post: ContentPost) -> str:
        """Build a comprehensive AI brief from ContentPost metadata.

        Pulls title, visual_brief, description, platform, content_pillar,
        and scheduled time to create a rich context for AI scene generation.
        """
        parts: list[str] = []

        # Title is always included
        if post.title:
            parts.append(post.title)

        # Visual brief is the primary creative direction
        if post.visual_brief:
            parts.append(f"Vizualni smjer: {post.visual_brief}")

        # Caption gives tone/message context
        if post.caption_hr:
            parts.append(f"Ton poruke: {post.caption_hr}")

        # Platform and type context
        platform = (post.platform or "instagram").capitalize()
        content_type = ""
        title_lower = (post.title or "").lower()
        if "reel" in title_lower:
            content_type = "Reel"
        elif "story" in title_lower or "stories" in title_lower:
            content_type = "Story"
        elif "short" in title_lower:
            content_type = "Short"
        elif "carousel" in title_lower:
            content_type = "Carousel"

        platform_str = f"Platforma: {platform}"
        if content_type:
            platform_str += f" ({content_type})"
        parts.append(platform_str)

        # Content pillar context
        pillar_map = {
            "match_day": "Matchday / Dan utakmice",
            "match_highlights": "Highlights utakmice",
            "behind_scenes": "Iza kulisa",
            "academy": "Akademija / Mladi",
            "transfer": "Transfer / Vijesti",
            "history": "Povijest / Throwback",
            "fan_engagement": "Navijači / Engagement",
            "sponsors": "Sponzori / Partneri",
        }
        if post.content_pillar:
            pillar_label = pillar_map.get(post.content_pillar, post.content_pillar)
            parts.append(f"Kategorija: {pillar_label}")

        # Scheduled time context (e.g., "Subota 17:30")
        if post.scheduled_at:
            try:
                day_names = {
                    0: "Ponedjeljak", 1: "Utorak", 2: "Srijeda",
                    3: "Četvrtak", 4: "Petak", 5: "Subota", 6: "Nedjelja",
                }
                day_name = day_names.get(post.scheduled_at.weekday(), "")
                time_str = post.scheduled_at.strftime("%H:%M")
                parts.append(f"Zakazano: {day_name} {time_str}")
            except Exception:
                pass

        return "\n".join(parts)

    @staticmethod
    def _detect_content_type(post: ContentPost) -> str:
        """Detect content type from post metadata."""
        title = (post.title or "").lower()
        platform = (post.platform or "").lower()

        if "reel" in title:
            return "reel"
        if "short" in title:
            return "short"
        if "story" in title or "stories" in title:
            return "story"
        if "carousel" in title:
            return "carousel"
        if "video" in title:
            return "video"

        # Platform defaults
        if platform == "tiktok":
            return "reel"
        if platform == "youtube":
            return "video"

        return "post"

    @staticmethod
    def _detect_content_type_from_brief(brief: str) -> str:
        """Detect content type from brief text (for mock/frontend posts)."""
        brief_lower = brief.lower()
        if "reel" in brief_lower:
            return "reel"
        if "short" in brief_lower:
            return "short"
        if "story" in brief_lower or "stories" in brief_lower:
            return "story"
        if "carousel" in brief_lower:
            return "carousel"
        if "video" in brief_lower:
            return "video"
        return "reel"  # Default to reel for mock data
