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
        """Get existing StudioProject or create a new draft."""
        query = select(StudioProject).where(StudioProject.post_id == post_id)
        result = await db.execute(query)
        project = result.scalar_one_or_none()

        if project:
            return project

        # Verify post exists
        post_query = select(ContentPost).where(ContentPost.id == post_id)
        post_result = await db.execute(post_query)
        post = post_result.scalar_one_or_none()
        if not post:
            raise ValueError(f"Post {post_id} not found")

        project = StudioProject(
            post_id=post_id,
            brief="",
            scene_data=None,
            generated_caption="",
            generated_hashtags=None,
            generated_description="",
            output_url="",
            output_type="",
            status="draft",
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
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

        # Get post details
        post_query = select(ContentPost).where(ContentPost.id == post_id)
        post_result = await db.execute(post_query)
        post = post_result.scalar_one_or_none()
        if not post:
            raise ValueError(f"Post {post_id} not found")

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

        # Determine content type from post
        content_type = self._detect_content_type(post)

        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        try:
            scene_data = await generate_studio_scenes(
                api_key=api_key,
                brief=brief,
                post_title=post.title or "",
                platform=post.platform or "instagram",
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
        self, db: AsyncSession, post_id: uuid.UUID
    ) -> dict:
        """Set visual_url on ContentPost and publish via UnifiedPublisher."""
        from app.dependencies import get_publisher
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

        # Update post with studio output
        # Build full URL for publisher
        base_url = settings.CORS_ORIGINS.split(",")[0].strip()
        full_output_url = project.output_url
        if not full_output_url.startswith("http"):
            # Make absolute for API-based publishing
            full_output_url = f"{base_url}{full_output_url}"

        post.visual_url = full_output_url
        if project.generated_caption:
            post.caption_hr = project.generated_caption
        if project.generated_hashtags:
            post.hashtags = project.generated_hashtags
        post.status = "approved"
        await db.commit()

        # Publish via UnifiedPublisher
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
