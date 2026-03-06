"""Telegram Bot API publisher for test publishing from Content Studio."""

import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramPublisher:
    """Publish content to a Telegram channel via Bot API.

    This is the simplest real publishing integration — ideal for beta testing
    the Content Studio flow without dealing with Meta/TikTok OAuth complexity.
    """

    def __init__(self, bot_token: str, channel_id: str):
        if not bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not configured")
        if not channel_id:
            raise ValueError("TELEGRAM_CHANNEL_ID is not configured")
        self._token = bot_token
        self._channel_id = channel_id
        self._base = f"{TELEGRAM_API_BASE}/bot{bot_token}"

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def send_message(self, text: str) -> dict:
        """Send a text-only message to the channel."""
        url = f"{self._base}/sendMessage"
        payload = {
            "chat_id": self._channel_id,
            "text": text,
            "parse_mode": "HTML",
        }
        return await self._request(url, payload)

    async def send_photo_url(self, photo_url: str, caption: str = "") -> dict:
        """Send a photo by URL to the channel (max 10 MB via URL)."""
        url = f"{self._base}/sendPhoto"
        payload = {
            "chat_id": self._channel_id,
            "photo": photo_url,
            "caption": caption[:1024],  # Telegram caption limit
            "parse_mode": "HTML",
        }
        return await self._request(url, payload)

    async def send_photo_file(self, file_path: str, caption: str = "") -> dict:
        """Upload a photo file directly to the channel (max 10 MB)."""
        url = f"{self._base}/sendPhoto"
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Photo file not found: {file_path}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(path, "rb") as f:
                files = {"photo": (path.name, f, "image/png")}
                data = {
                    "chat_id": self._channel_id,
                    "caption": caption[:1024],
                    "parse_mode": "HTML",
                }
                response = await client.post(url, data=data, files=files)
                response.raise_for_status()
                result = response.json()

        if not result.get("ok"):
            error = result.get("description", "Unknown Telegram error")
            logger.error("Telegram send_photo_file failed: %s", error)
            raise RuntimeError(f"Telegram error: {error}")

        logger.info("Telegram photo sent via file upload: %s", path.name)
        return result.get("result", {})

    async def send_video_url(self, video_url: str, caption: str = "") -> dict:
        """Send a video by URL to the channel (max 50 MB via URL)."""
        url = f"{self._base}/sendVideo"
        payload = {
            "chat_id": self._channel_id,
            "video": video_url,
            "caption": caption[:1024],
            "parse_mode": "HTML",
            "supports_streaming": True,
        }
        return await self._request(url, payload)

    async def send_video_file(self, file_path: str, caption: str = "") -> dict:
        """Upload a video file directly to the channel (max 50 MB)."""
        url = f"{self._base}/sendVideo"
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Video file not found: {file_path}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            with open(path, "rb") as f:
                files = {"video": (path.name, f, "video/mp4")}
                data = {
                    "chat_id": self._channel_id,
                    "caption": caption[:1024],
                    "parse_mode": "HTML",
                    "supports_streaming": "true",
                }
                response = await client.post(url, data=data, files=files)
                response.raise_for_status()
                result = response.json()

        if not result.get("ok"):
            error = result.get("description", "Unknown Telegram error")
            logger.error("Telegram send_video_file failed: %s", error)
            raise RuntimeError(f"Telegram error: {error}")

        logger.info("Telegram video sent via file upload: %s", path.name)
        return result.get("result", {})

    async def get_me(self) -> dict:
        """Test the bot token by calling getMe."""
        url = f"{self._base}/getMe"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            result = response.json()
        if not result.get("ok"):
            raise RuntimeError(f"Telegram getMe failed: {result}")
        return result.get("result", {})

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _request(self, url: str, payload: dict) -> dict:
        """Make a JSON POST request to Telegram API."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()

        if not result.get("ok"):
            error = result.get("description", "Unknown Telegram error")
            logger.error("Telegram API error: %s", error)
            raise RuntimeError(f"Telegram error: {error}")

        logger.info("Telegram message sent successfully to %s", self._channel_id)
        return result.get("result", {})
