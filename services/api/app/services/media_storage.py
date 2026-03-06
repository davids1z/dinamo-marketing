"""Local media storage service for generated images.

Saves images to a local directory (Docker volume mountable) and provides
URL paths for serving via FastAPI's StaticFiles.
"""

import base64
import logging
import shutil
import uuid
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)


class MediaStorageService:
    """Stores generated images locally and returns serving URLs."""

    def __init__(self, media_root: str = "./media"):
        self._root = Path(media_root)
        self._root.mkdir(parents=True, exist_ok=True)

    async def save_image(
        self,
        image_source: str | bytes,
        post_id: str,
        platform: str,
    ) -> str:
        """Download/decode an image and save it locally.

        Args:
            image_source: URL (http/https), data URI (base64), or raw bytes.
            post_id: The ContentPost ID — used as subdirectory.
            platform: Platform name — used in filename.

        Returns:
            Relative path from media root (e.g. ``posts/<id>/instagram_<uuid>.png``).
        """
        post_dir = self._root / "posts" / post_id
        post_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{platform}_{uuid.uuid4().hex[:8]}.png"
        file_path = post_dir / filename

        if isinstance(image_source, bytes):
            file_path.write_bytes(image_source)
        elif image_source.startswith("data:"):
            # data:image/png;base64,<data>
            _, encoded = image_source.split(",", 1)
            file_path.write_bytes(base64.b64decode(encoded))
        elif image_source.startswith("http"):
            await self._download_file(image_source, file_path)
        else:
            raise ValueError(f"Unsupported image source format: {image_source[:50]}...")

        rel_path = f"posts/{post_id}/{filename}"
        logger.info("Saved image: %s", rel_path)
        return rel_path

    def get_url(self, rel_path: str) -> str:
        """Convert a relative storage path to a serving URL."""
        return f"/media/{rel_path}"

    def delete_post_media(self, post_id: str) -> int:
        """Remove all media files for a post. Returns count of deleted files."""
        post_dir = self._root / "posts" / post_id
        if not post_dir.exists():
            return 0
        count = sum(1 for _ in post_dir.iterdir())
        shutil.rmtree(post_dir)
        logger.info("Deleted %d media files for post %s", count, post_id)
        return count

    @staticmethod
    async def _download_file(url: str, dest: Path) -> None:
        """Download a file from URL to local path."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
