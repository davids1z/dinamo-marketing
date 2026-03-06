"""Real TikTok Marketing / Content API client.

Requires valid TikTok API credentials (app_id, app_secret, access_token).

Content API base: https://open.tiktokapis.com/v2
Ads API base:     https://business-api.tiktok.com/open_api/v1.3
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.integrations.base import TikTokClientBase

logger = logging.getLogger(__name__)

_CONTENT_BASE = "https://open.tiktokapis.com/v2"
_ADS_BASE = "https://business-api.tiktok.com/open_api/v1.3"

# Default timeout for all HTTP requests (seconds).
_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


class TikTokAPIError(Exception):
    """Raised when TikTok returns a non-success response."""

    def __init__(self, message: str, code: int | None = None, data: Any = None):
        self.code = code
        self.data = data
        super().__init__(message)


class TikTokClient(TikTokClientBase):
    """Production TikTok API client backed by httpx."""

    def __init__(
        self,
        app_id: str,
        app_secret: str,
        access_token: str,
        advertiser_id: str,
    ):
        self._app_id = app_id
        self._app_secret = app_secret
        self._access_token = access_token
        self._advertiser_id = advertiser_id

    # ------------------------------------------------------------------
    # HTTP helpers
    # ------------------------------------------------------------------

    def _content_headers(self) -> dict[str, str]:
        """Headers for the TikTok Content / Login Kit API."""
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }

    def _ads_headers(self) -> dict[str, str]:
        """Headers for the TikTok Marketing (Ads) API."""
        return {
            "Access-Token": self._access_token,
            "Content-Type": "application/json",
        }

    async def _content_request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a request against the TikTok Content API.

        Returns the parsed JSON response body.  Raises ``TikTokAPIError``
        if the ``error.code`` field indicates failure.
        """
        url = f"{_CONTENT_BASE}{path}"
        logger.debug("TikTok Content API %s %s", method, url)

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.request(
                method,
                url,
                headers=self._content_headers(),
                params=params,
                json=json_body,
            )

        response.raise_for_status()
        data: dict[str, Any] = response.json()

        # Content API wraps errors in {"error": {"code": ..., "message": ...}}
        error_info = data.get("error", {})
        error_code = error_info.get("code", "ok")
        if error_code != "ok" and error_code != 0:
            msg = error_info.get("message", "Unknown TikTok Content API error")
            logger.error(
                "TikTok Content API error on %s %s: [%s] %s",
                method,
                path,
                error_code,
                msg,
            )
            raise TikTokAPIError(msg, code=error_code, data=data)

        return data

    async def _ads_request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a request against the TikTok Marketing (Ads) API.

        Returns the ``data`` dict from the response.  Raises
        ``TikTokAPIError`` when the ``code`` field is non-zero.
        """
        url = f"{_ADS_BASE}{path}"
        logger.debug("TikTok Ads API %s %s", method, url)

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.request(
                method,
                url,
                headers=self._ads_headers(),
                params=params,
                json=json_body,
            )

        response.raise_for_status()
        body: dict[str, Any] = response.json()

        # Ads API returns {"code": 0, "message": "OK", "data": {...}}
        code = body.get("code", -1)
        if code != 0:
            msg = body.get("message", "Unknown TikTok Ads API error")
            logger.error(
                "TikTok Ads API error on %s %s: [%s] %s",
                method,
                path,
                code,
                msg,
            )
            raise TikTokAPIError(msg, code=code, data=body)

        return body.get("data", {})

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    async def health_check(self) -> dict:
        """Verify credentials by fetching basic user info."""
        try:
            info = await self.get_account_info()
            return {
                "status": "ok",
                "platform": "tiktok",
                "mock": False,
                "display_name": info.get("display_name"),
            }
        except Exception as exc:
            logger.warning("TikTok health check failed: %s", exc)
            return {
                "status": "error",
                "platform": "tiktok",
                "mock": False,
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Content API
    # ------------------------------------------------------------------

    async def get_account_info(self) -> dict:
        """GET /v2/user/info/ -- retrieve the authenticated user's profile."""
        fields = (
            "open_id,union_id,display_name,avatar_url,"
            "follower_count,following_count,likes_count,"
            "video_count,bio_description,is_verified"
        )
        data = await self._content_request(
            "GET",
            "/user/info/",
            params={"fields": fields},
        )
        return data.get("data", {}).get("user", data.get("data", {}))

    async def get_video_list(self, limit: int = 20) -> list[dict]:
        """POST /v2/video/list/ -- list videos for the authenticated user."""
        fields = (
            "id,title,video_description,cover_image_url,share_url,"
            "create_time,duration,like_count,comment_count,"
            "share_count,view_count"
        )
        data = await self._content_request(
            "POST",
            "/video/list/",
            params={"fields": fields},
            json_body={"max_count": min(limit, 20)},
        )
        videos = data.get("data", {}).get("videos", [])
        # Normalise field names so they align with our TikTokVideo type.
        result: list[dict] = []
        for v in videos:
            result.append(
                {
                    "id": v.get("id"),
                    "title": v.get("title", ""),
                    "description": v.get("video_description", ""),
                    "cover_image_url": v.get("cover_image_url", ""),
                    "share_url": v.get("share_url", ""),
                    "create_time": v.get("create_time", 0),
                    "duration": v.get("duration", 0),
                    "like_count": v.get("like_count", 0),
                    "comment_count": v.get("comment_count", 0),
                    "share_count": v.get("share_count", 0),
                    "view_count": v.get("view_count", 0),
                }
            )
        return result

    async def get_video_insights(self, video_id: str) -> dict:
        """Return engagement data for a single video.

        TikTok's v2 Content API does not expose a dedicated per-video
        insights endpoint.  We fetch the video list (which includes
        engagement counters) and filter for the requested video.
        """
        fields = (
            "id,title,video_description,like_count,comment_count,"
            "share_count,view_count"
        )
        data = await self._content_request(
            "POST",
            "/video/list/",
            params={"fields": fields},
            json_body={"max_count": 20},
        )
        videos = data.get("data", {}).get("videos", [])
        for v in videos:
            if v.get("id") == video_id:
                return {
                    "video_id": video_id,
                    "total_views": v.get("view_count", 0),
                    "total_likes": v.get("like_count", 0),
                    "total_comments": v.get("comment_count", 0),
                    "total_shares": v.get("share_count", 0),
                }
        # Video not found in the recent list -- return an empty shell.
        logger.warning(
            "Video %s not found in recent video list; returning empty insights.",
            video_id,
        )
        return {
            "video_id": video_id,
            "total_views": 0,
            "total_likes": 0,
            "total_comments": 0,
            "total_shares": 0,
        }

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    async def publish_video(
        self,
        video_url: str,
        caption: str,
        hashtags: list[str] | None = None,
    ) -> dict:
        """POST /v2/post/publish/video/init/ -- Direct Post a video.

        Uses *pull* mode: TikTok downloads the video from ``video_url``.
        """
        title = caption
        if hashtags:
            tag_str = " ".join(f"#{h.lstrip('#')}" for h in hashtags)
            title = f"{caption} {tag_str}"

        payload: dict[str, Any] = {
            "post_info": {
                "title": title,
                "privacy_level": "SELF_ONLY",
                "disable_duet": False,
                "disable_stitch": False,
                "disable_comment": False,
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": video_url,
            },
        }

        data = await self._content_request(
            "POST",
            "/post/publish/video/init/",
            json_body=payload,
        )
        publish_id = data.get("data", {}).get("publish_id", "")
        logger.info("TikTok publish initiated: publish_id=%s", publish_id)
        return {
            "publish_id": publish_id,
            "status": "processing",
        }

    # ------------------------------------------------------------------
    # Ads / Marketing API
    # ------------------------------------------------------------------

    async def create_campaign(self, data: dict) -> dict:
        """POST /open_api/v1.3/campaign/create/ -- create an ad campaign."""
        payload = {
            "advertiser_id": self._advertiser_id,
            "campaign_name": data.get("campaign_name", "Untitled Campaign"),
            "objective_type": data.get("objective_type", "TRAFFIC"),
            "budget_mode": data.get("budget_mode", "BUDGET_MODE_DAY"),
            "budget": data.get("budget", 0),
            **{k: v for k, v in data.items() if k not in {
                "campaign_name", "objective_type", "budget_mode", "budget",
            }},
        }
        result = await self._ads_request(
            "POST",
            "/campaign/create/",
            json_body=payload,
        )
        return {
            "campaign_id": result.get("campaign_id"),
            "campaign_name": payload["campaign_name"],
            "status": "CAMPAIGN_STATUS_DISABLE",
            "objective_type": payload["objective_type"],
            "budget": payload["budget"],
            "budget_mode": payload["budget_mode"],
        }

    async def create_ad_group(self, data: dict) -> dict:
        """POST /open_api/v1.3/adgroup/create/ -- create an ad group."""
        payload = {
            "advertiser_id": self._advertiser_id,
            "campaign_id": data.get("campaign_id"),
            "adgroup_name": data.get("adgroup_name", "Untitled Ad Group"),
            "placement_type": data.get("placement_type", "PLACEMENT_TYPE_AUTOMATIC"),
            "budget": data.get("budget", 0),
            **{k: v for k, v in data.items() if k not in {
                "campaign_id", "adgroup_name", "placement_type", "budget",
            }},
        }
        result = await self._ads_request(
            "POST",
            "/adgroup/create/",
            json_body=payload,
        )
        return {
            "adgroup_id": result.get("adgroup_id"),
            "campaign_id": payload["campaign_id"],
            "adgroup_name": payload["adgroup_name"],
            "status": "ADGROUP_STATUS_DISABLE",
            "placement_type": payload["placement_type"],
            "budget": payload["budget"],
        }

    async def create_ad(self, data: dict) -> dict:
        """POST /open_api/v1.3/ad/create/ -- create an ad."""
        payload = {
            "advertiser_id": self._advertiser_id,
            "adgroup_id": data.get("adgroup_id"),
            "ad_name": data.get("ad_name", "Untitled Ad"),
            "ad_format": data.get("ad_format", "SINGLE_VIDEO"),
            **{k: v for k, v in data.items() if k not in {
                "adgroup_id", "ad_name", "ad_format",
            }},
        }
        result = await self._ads_request(
            "POST",
            "/ad/create/",
            json_body=payload,
        )
        return {
            "ad_id": result.get("ad_id"),
            "adgroup_id": payload["adgroup_id"],
            "ad_name": payload["ad_name"],
            "status": "AD_STATUS_DISABLE",
            "ad_format": payload["ad_format"],
        }

    async def get_ad_insights(self, ad_id: str) -> dict:
        """GET /open_api/v1.3/report/integrated/get/ -- ad-level reporting."""
        params: dict[str, Any] = {
            "advertiser_id": self._advertiser_id,
            "report_type": "BASIC",
            "data_level": "AUCTION_AD",
            "dimensions": '["ad_id"]',
            "metrics": (
                '["impressions","clicks","spend","cpc","cpm","ctr",'
                '"conversions","cost_per_conversion",'
                '"video_views_p25","video_views_p50",'
                '"video_views_p75","video_views_p100"]'
            ),
            "filters": f'[{{"field_name":"ad_id","filter_type":"IN","filter_value":"[\\"{ad_id}\\"]"}}]',
            "start_date": "2020-01-01",
            "end_date": "2099-12-31",
            "page": 1,
            "page_size": 1,
        }
        result = await self._ads_request(
            "GET",
            "/report/integrated/get/",
            params=params,
        )
        rows = result.get("list", [])
        if not rows:
            logger.warning("No insights returned for ad %s", ad_id)
            return {"ad_id": ad_id}

        metrics = rows[0].get("metrics", {})
        return {
            "ad_id": ad_id,
            "impressions": int(metrics.get("impressions", 0)),
            "clicks": int(metrics.get("clicks", 0)),
            "spend": float(metrics.get("spend", 0)),
            "cpc": float(metrics.get("cpc", 0)),
            "cpm": float(metrics.get("cpm", 0)),
            "ctr": float(metrics.get("ctr", 0)),
            "conversions": int(metrics.get("conversions", 0)),
            "cost_per_conversion": float(metrics.get("cost_per_conversion", 0)),
            "video_views_p25": int(metrics.get("video_views_p25", 0)),
            "video_views_p50": int(metrics.get("video_views_p50", 0)),
            "video_views_p75": int(metrics.get("video_views_p75", 0)),
            "video_views_p100": int(metrics.get("video_views_p100", 0)),
        }
