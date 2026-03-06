"""Real YouTube Data API v3 client.

Requires a valid Google API key for read operations.
Upload / publishing operations require OAuth2 credentials (not yet implemented).
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.integrations.base import YouTubeClientBase

logger = logging.getLogger(__name__)

_DATA_API_BASE = "https://www.googleapis.com/youtube/v3"
_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3"


class YouTubeClient(YouTubeClientBase):
    """Production YouTube Data API client.

    Parameters
    ----------
    api_key:
        Google API key with YouTube Data API v3 enabled.
    channel_id:
        Default channel ID used for operations that don't receive one
        explicitly.  Stored for convenience but every public method still
        accepts ``channel_id`` so callers can override.
    """

    def __init__(
        self,
        api_key: str | None = None,
        channel_id: str | None = None,
    ) -> None:
        self._api_key = api_key
        self._channel_id = channel_id
        self._base_url = _DATA_API_BASE
        self._http: httpx.AsyncClient | None = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_http(self) -> httpx.AsyncClient:
        """Lazily create a shared ``httpx.AsyncClient``."""
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
            )
        return self._http

    async def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        content: bytes | None = None,
    ) -> dict:
        """Send an HTTP request and return the parsed JSON response.

        Automatically injects the ``key`` query-parameter for Data API
        calls when *params* does not already contain one.

        Raises
        ------
        httpx.HTTPStatusError
            On 4xx / 5xx responses from the YouTube API.
        """
        params = dict(params or {})
        # Inject API key for regular Data API requests (not uploads).
        if "key" not in params and self._api_key and _UPLOAD_BASE not in url:
            params["key"] = self._api_key

        client = self._get_http()
        logger.debug("YouTube API %s %s params=%s", method, url, params)

        response = await client.request(
            method,
            url,
            params=params,
            json=json,
            headers=headers,
            content=content,
        )

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body = response.text
            logger.error(
                "YouTube API error %s %s -> %s: %s",
                method,
                url,
                response.status_code,
                body[:500],
            )
            raise

        data: dict = response.json()
        return data

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    async def health_check(self) -> dict:
        """Verify connectivity by fetching channel snippet for the
        configured channel (or the YouTube API status endpoint).
        """
        if not self._api_key:
            return {
                "status": "error",
                "platform": "youtube",
                "detail": "No API key configured",
            }

        channel_id = self._channel_id or "UC_x5XG1OV2P6uZZ5FSM9Ttw"  # fallback: Google Developers
        try:
            data = await self._request(
                "GET",
                f"{self._base_url}/channels",
                params={
                    "part": "snippet",
                    "id": channel_id,
                },
            )
            items = data.get("items", [])
            return {
                "status": "ok",
                "platform": "youtube",
                "channel_found": len(items) > 0,
            }
        except Exception as exc:
            logger.exception("YouTube health-check failed")
            return {
                "status": "error",
                "platform": "youtube",
                "detail": str(exc),
            }

    # ------------------------------------------------------------------
    # Read endpoints
    # ------------------------------------------------------------------

    async def get_channel_stats(self, channel_id: str) -> dict:
        """Return channel statistics and snippet metadata.

        Calls ``GET /channels?part=statistics,snippet&id={channel_id}``.
        """
        data = await self._request(
            "GET",
            f"{self._base_url}/channels",
            params={
                "part": "statistics,snippet",
                "id": channel_id,
            },
        )

        items = data.get("items", [])
        if not items:
            logger.warning("No channel found for id=%s", channel_id)
            return {"channel_id": channel_id, "error": "channel_not_found"}

        item = items[0]
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})

        return {
            "channel_id": channel_id,
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "subscriber_count": int(stats.get("subscriberCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
            "view_count": int(stats.get("viewCount", 0)),
            "custom_url": snippet.get("customUrl", ""),
            "thumbnail_url": (
                snippet.get("thumbnails", {}).get("high", {}).get("url", "")
            ),
            "published_at": snippet.get("publishedAt", ""),
        }

    async def get_recent_videos(
        self, channel_id: str, limit: int = 10
    ) -> list[dict]:
        """Return the most recent videos for a channel, enriched with stats.

        1. ``GET /search`` to find recent video IDs.
        2. ``GET /videos`` to fetch statistics + contentDetails in bulk.
        """
        # Step 1 -- search for recent uploads
        search_data = await self._request(
            "GET",
            f"{self._base_url}/search",
            params={
                "part": "snippet",
                "channelId": channel_id,
                "type": "video",
                "order": "date",
                "maxResults": str(limit),
            },
        )

        search_items = search_data.get("items", [])
        if not search_items:
            return []

        video_ids = [
            item["id"]["videoId"]
            for item in search_items
            if "videoId" in item.get("id", {})
        ]

        if not video_ids:
            return []

        # Step 2 -- fetch full statistics for all videos in one call
        videos_data = await self._request(
            "GET",
            f"{self._base_url}/videos",
            params={
                "part": "statistics,contentDetails,snippet",
                "id": ",".join(video_ids),
            },
        )

        stats_map: dict[str, dict] = {}
        for v in videos_data.get("items", []):
            stats_map[v["id"]] = v

        # Step 3 -- merge search snippets with full video data
        results: list[dict] = []
        for item in search_items:
            vid = item.get("id", {}).get("videoId")
            if not vid:
                continue

            search_snippet = item.get("snippet", {})
            full = stats_map.get(vid, {})
            full_snippet = full.get("snippet", {})
            stats = full.get("statistics", {})
            content = full.get("contentDetails", {})

            results.append(
                {
                    "video_id": vid,
                    "title": full_snippet.get("title", search_snippet.get("title", "")),
                    "description": full_snippet.get(
                        "description", search_snippet.get("description", "")
                    ),
                    "published_at": full_snippet.get(
                        "publishedAt", search_snippet.get("publishedAt", "")
                    ),
                    "thumbnail_url": (
                        full_snippet.get("thumbnails", search_snippet.get("thumbnails", {}))
                        .get("high", {})
                        .get("url", "")
                    ),
                    "duration": content.get("duration", ""),
                    "view_count": int(stats.get("viewCount", 0)),
                    "like_count": int(stats.get("likeCount", 0)),
                    "comment_count": int(stats.get("commentCount", 0)),
                    "tags": full_snippet.get("tags", []),
                }
            )

        return results

    async def get_video_stats(self, video_id: str) -> dict:
        """Return detailed statistics for a single video.

        Calls ``GET /videos?part=statistics,contentDetails&id={video_id}``.
        """
        data = await self._request(
            "GET",
            f"{self._base_url}/videos",
            params={
                "part": "statistics,contentDetails",
                "id": video_id,
            },
        )

        items = data.get("items", [])
        if not items:
            logger.warning("No video found for id=%s", video_id)
            return {"video_id": video_id, "error": "video_not_found"}

        item = items[0]
        stats = item.get("statistics", {})
        content = item.get("contentDetails", {})

        return {
            "video_id": video_id,
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
            "favorite_count": int(stats.get("favoriteCount", 0)),
            "duration": content.get("duration", ""),
            "definition": content.get("definition", ""),
            "caption": content.get("caption", "false"),
        }

    async def get_audience_demographics(self, channel_id: str) -> dict:
        """Return audience demographics for a channel.

        NOTE: The YouTube Analytics API requires OAuth2 credentials with
        the ``yt-analytics.readonly`` scope.  This method returns a
        placeholder response until OAuth2 support is added.
        """
        logger.info(
            "get_audience_demographics called for channel_id=%s -- "
            "returning placeholder (YouTube Analytics API requires OAuth2)",
            channel_id,
        )
        return {
            "channel_id": channel_id,
            "note": (
                "Audience demographics require the YouTube Analytics API "
                "with OAuth2 credentials (yt-analytics.readonly scope). "
                "This is a placeholder response."
            ),
            "age_group": {},
            "gender": {},
            "country": {},
            "device_type": {},
            "traffic_source": {},
        }

    # ------------------------------------------------------------------
    # Publishing endpoints
    # ------------------------------------------------------------------

    async def upload_video(
        self,
        video_path: str,
        title: str,
        description: str,
        tags: list[str] | None = None,
        privacy: str = "public",
        *,
        _category_id: str = "17",
    ) -> dict:
        """Upload a video via the YouTube resumable-upload protocol.

        NOTE: This endpoint requires OAuth2 credentials with the
        ``youtube.upload`` scope.  The current implementation downloads
        the file from *video_path* (treated as a URL or local path) and
        performs a single-request upload.  For very large files a true
        resumable upload should be used instead.

        Parameters
        ----------
        video_path:
            URL or local filesystem path to the video file.
        title:
            Video title (max 100 characters).
        description:
            Video description (max 5000 characters).
        tags:
            Optional list of keyword tags.
        privacy:
            One of ``"public"``, ``"unlisted"``, or ``"private"``.
        _category_id:
            YouTube category ID.  Defaults to ``"17"`` (Sports).
            Internal parameter used by :meth:`upload_short` to set
            ``"22"`` (People & Blogs).
        """
        if not self._api_key:
            return {
                "error": "upload_requires_oauth2",
                "detail": (
                    "Video uploads require OAuth2 credentials with the "
                    "youtube.upload scope.  API-key authentication is "
                    "insufficient for write operations."
                ),
            }

        logger.info(
            "upload_video called: title=%r privacy=%s path=%s",
            title,
            privacy,
            video_path,
        )

        # Build the metadata body
        body: dict[str, Any] = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags or [],
                "categoryId": _category_id,
            },
            "status": {
                "privacyStatus": privacy,
                "selfDeclaredMadeForKids": False,
            },
        }

        # Read the video bytes (from URL or local file)
        video_bytes = await self._read_video(video_path)

        # Initiate resumable upload
        upload_url = f"{_UPLOAD_BASE}/videos"

        client = self._get_http()

        # Step 1: initiate the resumable session
        init_response = await client.post(
            upload_url,
            params={
                "uploadType": "resumable",
                "part": "snippet,status",
                "key": self._api_key,
            },
            json=body,
            headers={
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": "video/*",
                "X-Upload-Content-Length": str(len(video_bytes)),
            },
        )

        try:
            init_response.raise_for_status()
        except httpx.HTTPStatusError:
            logger.error(
                "Failed to initiate resumable upload: %s %s",
                init_response.status_code,
                init_response.text[:500],
            )
            return {
                "error": "upload_init_failed",
                "status_code": init_response.status_code,
                "detail": init_response.text[:500],
            }

        resumable_uri = init_response.headers.get("Location")
        if not resumable_uri:
            logger.error("No Location header in resumable-upload init response")
            return {"error": "no_resumable_uri"}

        # Step 2: upload the video bytes
        upload_response = await client.put(
            resumable_uri,
            content=video_bytes,
            headers={
                "Content-Type": "video/*",
                "Content-Length": str(len(video_bytes)),
            },
            timeout=httpx.Timeout(300.0, connect=30.0),
        )

        try:
            upload_response.raise_for_status()
        except httpx.HTTPStatusError:
            logger.error(
                "Video upload failed: %s %s",
                upload_response.status_code,
                upload_response.text[:500],
            )
            return {
                "error": "upload_failed",
                "status_code": upload_response.status_code,
                "detail": upload_response.text[:500],
            }

        result: dict = upload_response.json()
        logger.info("Video uploaded successfully: id=%s", result.get("id"))

        return {
            "video_id": result.get("id", ""),
            "title": result.get("snippet", {}).get("title", title),
            "status": result.get("status", {}).get("uploadStatus", ""),
            "privacy": result.get("status", {}).get("privacyStatus", privacy),
        }

    async def upload_short(
        self,
        video_path: str,
        title: str,
        description: str,
    ) -> dict:
        """Upload a YouTube Short.

        Shorts are regular uploads with ``#Shorts`` appended to the
        title and ``categoryId`` set to ``22`` (People & Blogs).
        """
        short_title = title if "#Shorts" in title else f"{title} #Shorts"

        result = await self.upload_video(
            video_path=video_path,
            title=short_title,
            description=description,
            tags=["Shorts"],
            privacy="public",
            _category_id="22",  # People & Blogs
        )

        if "error" not in result:
            result["is_short"] = True

        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _read_video(self, video_path: str) -> bytes:
        """Read video bytes from a URL or local file path."""
        if video_path.startswith(("http://", "https://")):
            logger.debug("Downloading video from URL: %s", video_path)
            client = self._get_http()
            response = await client.get(
                video_path,
                timeout=httpx.Timeout(300.0, connect=30.0),
                follow_redirects=True,
            )
            response.raise_for_status()
            return response.content

        # Local file
        logger.debug("Reading video from local path: %s", video_path)
        import aiofiles

        async with aiofiles.open(video_path, "rb") as f:
            return await f.read()

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._http and not self._http.is_closed:
            await self._http.aclose()
            self._http = None
