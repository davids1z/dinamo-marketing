"""Real Meta (Facebook / Instagram) Graph API client.

Uses httpx.AsyncClient to communicate with the Meta Graph API v21.0.
Requires a valid Meta access token with appropriate permissions:
  - pages_read_engagement, pages_manage_posts (Facebook Page)
  - instagram_basic, instagram_content_publish (Instagram)
  - ads_management, ads_read (Ads)
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.integrations.base import MetaClientBase

logger = logging.getLogger(__name__)

BASE_URL = "https://graph.facebook.com/v21.0"

# Timeout configuration: generous connect, long read for video uploads
_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=30.0, pool=10.0)

# Instagram publishing: poll until container is ready
_IG_PUBLISH_POLL_INTERVAL = 3  # seconds
_IG_PUBLISH_MAX_ATTEMPTS = 40  # ~2 minutes max wait


class MetaAPIError(Exception):
    """Raised when the Meta Graph API returns an error response."""

    def __init__(self, status_code: int, error_data: dict | None = None, message: str = ""):
        self.status_code = status_code
        self.error_data = error_data or {}
        detail = error_data.get("error", {}).get("message", message) if error_data else message
        super().__init__(f"Meta API error {status_code}: {detail}")


class MetaClient(MetaClientBase):
    """Production Meta Graph API client."""

    def __init__(
        self,
        app_id: str,
        app_secret: str,
        access_token: str,
        ad_account_id: str = "",
        page_id: str = "",
        instagram_account_id: str = "",
    ):
        self._app_id = app_id
        self._app_secret = app_secret
        self._access_token = access_token
        self._ad_account_id = ad_account_id
        self._page_id = page_id
        self._instagram_account_id = instagram_account_id
        self._http: httpx.AsyncClient | None = None

    # ------------------------------------------------------------------
    # HTTP helpers
    # ------------------------------------------------------------------

    def _get_http_client(self) -> httpx.AsyncClient:
        """Lazily initialise the shared httpx.AsyncClient."""
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                base_url=BASE_URL,
                timeout=_TIMEOUT,
            )
        return self._http

    async def _request(
        self,
        method: str,
        endpoint: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
    ) -> dict:
        """Execute an HTTP request against the Graph API.

        The access_token is automatically injected into query params.
        Raises MetaAPIError on non-2xx responses.
        """
        client = self._get_http_client()

        merged_params: dict[str, Any] = {"access_token": self._access_token}
        if params:
            merged_params.update(params)

        url = f"/{endpoint.lstrip('/')}"
        logger.debug("Meta API %s %s params=%s", method, url, {k: v for k, v in merged_params.items() if k != "access_token"})

        try:
            response = await client.request(
                method,
                url,
                params=merged_params,
                json=json_body,
                data=data,
            )
        except httpx.HTTPError as exc:
            logger.error("Meta API request failed: %s", exc)
            raise MetaAPIError(status_code=0, message=str(exc)) from exc

        if response.status_code >= 400:
            try:
                error_data = response.json()
            except Exception:
                error_data = {"raw": response.text}
            logger.error(
                "Meta API error %s on %s %s: %s",
                response.status_code,
                method,
                url,
                error_data,
            )
            raise MetaAPIError(status_code=response.status_code, error_data=error_data)

        return response.json()

    async def _get(self, endpoint: str, **params: Any) -> dict:
        return await self._request("GET", endpoint, params=params)

    async def _post(
        self,
        endpoint: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
    ) -> dict:
        return await self._request("POST", endpoint, params=params, json_body=json_body, data=data)

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    async def health_check(self) -> dict:
        """Verify the access token is valid by calling GET /me."""
        result = await self._get("me")
        return {"status": "ok", "platform": "meta", "user": result}

    # ------------------------------------------------------------------
    # Page / Instagram insights
    # ------------------------------------------------------------------

    async def get_page_insights(
        self,
        page_id: str,
        metrics: list[str],
        period: str = "day",
    ) -> dict:
        """Fetch Facebook Page insights.

        GET /{page_id}/insights?metric=m1,m2&period=day
        """
        result = await self._get(
            f"{page_id}/insights",
            metric=",".join(metrics),
            period=period,
        )
        return {"page_id": page_id, "period": period, "data": result.get("data", [])}

    async def get_instagram_insights(
        self,
        account_id: str,
        metrics: list[str],
    ) -> dict:
        """Fetch Instagram account-level insights.

        GET /{account_id}/insights?metric=m1,m2&period=day
        """
        result = await self._get(
            f"{account_id}/insights",
            metric=",".join(metrics),
            period="day",
        )
        return {"account_id": account_id, "data": result.get("data", [])}

    async def get_instagram_media(
        self,
        account_id: str,
        limit: int = 25,
    ) -> list[dict]:
        """List recent Instagram media for an account.

        GET /{account_id}/media?fields=...&limit=N
        """
        fields = (
            "id,caption,media_type,media_url,thumbnail_url,"
            "timestamp,like_count,comments_count,permalink"
        )
        result = await self._get(
            f"{account_id}/media",
            fields=fields,
            limit=str(limit),
        )
        return result.get("data", [])

    async def get_audience_demographics(self, account_id: str) -> dict:
        """Fetch audience demographics (age/gender, country, city).

        Uses the Instagram Insights endpoint with lifetime period.
        """
        result = await self._get(
            f"{account_id}/insights",
            metric="audience_gender_age,audience_country,audience_city",
            period="lifetime",
        )

        demographics: dict[str, Any] = {
            "account_id": account_id,
            "age_gender": {},
            "country": {},
            "city": {},
        }

        for item in result.get("data", []):
            name = item.get("name", "")
            values = item.get("values", [{}])
            value_data = values[0].get("value", {}) if values else {}

            if name == "audience_gender_age":
                demographics["age_gender"] = value_data
            elif name == "audience_country":
                demographics["country"] = value_data
            elif name == "audience_city":
                demographics["city"] = value_data

        return demographics

    # ------------------------------------------------------------------
    # Facebook Publishing
    # ------------------------------------------------------------------

    async def publish_photo(
        self,
        page_id: str,
        image_url: str,
        caption: str,
    ) -> dict:
        """Publish a photo to a Facebook Page.

        POST /{page_id}/photos  with url=<image_url>&message=<caption>
        """
        logger.info("Publishing photo to Facebook page %s", page_id)
        result = await self._post(
            f"{page_id}/photos",
            params={"url": image_url, "message": caption},
        )
        logger.info("Photo published: id=%s", result.get("id"))
        return result

    async def publish_video(
        self,
        page_id: str,
        video_url: str,
        caption: str,
    ) -> dict:
        """Publish a video to a Facebook Page.

        POST /{page_id}/videos  with file_url=<video_url>&description=<caption>
        """
        logger.info("Publishing video to Facebook page %s", page_id)
        result = await self._post(
            f"{page_id}/videos",
            params={"file_url": video_url, "description": caption},
        )
        logger.info("Video published: id=%s", result.get("id"))
        return result

    # ------------------------------------------------------------------
    # Instagram Publishing
    # ------------------------------------------------------------------

    async def _wait_for_ig_container(self, container_id: str) -> None:
        """Poll the container status until it is FINISHED or we time out."""
        for attempt in range(_IG_PUBLISH_MAX_ATTEMPTS):
            status_resp = await self._get(container_id, fields="status_code,status")
            status_code = status_resp.get("status_code")
            logger.debug(
                "IG container %s status: %s (attempt %d)",
                container_id,
                status_code,
                attempt + 1,
            )
            if status_code == "FINISHED":
                return
            if status_code == "ERROR":
                raise MetaAPIError(
                    status_code=400,
                    message=f"Instagram media container {container_id} failed: {status_resp}",
                )
            await asyncio.sleep(_IG_PUBLISH_POLL_INTERVAL)

        raise MetaAPIError(
            status_code=408,
            message=f"Timed out waiting for Instagram container {container_id} to finish",
        )

    async def publish_instagram_media(
        self,
        account_id: str,
        image_url: str,
        caption: str,
    ) -> dict:
        """Publish a single image to Instagram (2-step process).

        Step 1: POST /{account_id}/media  (create container)
        Step 2: POST /{account_id}/media_publish  (publish container)
        """
        logger.info("Publishing Instagram image to account %s", account_id)

        # Step 1: Create media container
        container = await self._post(
            f"{account_id}/media",
            params={
                "image_url": image_url,
                "caption": caption,
            },
        )
        container_id = container["id"]
        logger.debug("Created IG container: %s", container_id)

        await self._wait_for_ig_container(container_id)

        # Step 2: Publish
        result = await self._post(
            f"{account_id}/media_publish",
            params={"creation_id": container_id},
        )
        logger.info("Instagram image published: id=%s", result.get("id"))
        return result

    async def publish_instagram_reel(
        self,
        account_id: str,
        video_url: str,
        caption: str,
    ) -> dict:
        """Publish a Reel to Instagram (2-step process).

        Step 1: POST /{account_id}/media  with media_type=REELS
        Step 2: POST /{account_id}/media_publish
        """
        logger.info("Publishing Instagram Reel to account %s", account_id)

        # Step 1: Create reel container
        container = await self._post(
            f"{account_id}/media",
            params={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
            },
        )
        container_id = container["id"]
        logger.debug("Created IG Reel container: %s", container_id)

        await self._wait_for_ig_container(container_id)

        # Step 2: Publish
        result = await self._post(
            f"{account_id}/media_publish",
            params={"creation_id": container_id},
        )
        logger.info("Instagram Reel published: id=%s", result.get("id"))
        return result

    async def publish_instagram_carousel(
        self,
        account_id: str,
        media_urls: list[str],
        caption: str,
    ) -> dict:
        """Publish a carousel to Instagram (3-step process).

        Step 1: Create individual item containers for each media URL
        Step 2: Create a carousel container referencing all item containers
        Step 3: Publish the carousel container
        """
        logger.info(
            "Publishing Instagram carousel (%d items) to account %s",
            len(media_urls),
            account_id,
        )

        # Step 1: Create item containers (can be done in parallel)
        item_container_ids: list[str] = []
        for url in media_urls:
            # Determine if this looks like a video by extension
            is_video = any(url.lower().endswith(ext) for ext in (".mp4", ".mov", ".avi"))
            params: dict[str, str] = {"is_carousel_item": "true"}
            if is_video:
                params["media_type"] = "VIDEO"
                params["video_url"] = url
            else:
                params["image_url"] = url

            container = await self._post(f"{account_id}/media", params=params)
            item_container_ids.append(container["id"])
            logger.debug("Created carousel item container: %s", container["id"])

        # Wait for all item containers to be ready
        for cid in item_container_ids:
            await self._wait_for_ig_container(cid)

        # Step 2: Create carousel container
        carousel_container = await self._post(
            f"{account_id}/media",
            params={
                "media_type": "CAROUSEL",
                "children": ",".join(item_container_ids),
                "caption": caption,
            },
        )
        carousel_id = carousel_container["id"]
        logger.debug("Created carousel container: %s", carousel_id)

        await self._wait_for_ig_container(carousel_id)

        # Step 3: Publish
        result = await self._post(
            f"{account_id}/media_publish",
            params={"creation_id": carousel_id},
        )
        logger.info("Instagram carousel published: id=%s", result.get("id"))
        return result

    # ------------------------------------------------------------------
    # Ads management
    # ------------------------------------------------------------------

    async def create_campaign(self, ad_account_id: str, data: dict) -> dict:
        """Create an ad campaign.

        POST /act_{ad_account_id}/campaigns
        """
        logger.info("Creating campaign on ad account %s", ad_account_id)
        endpoint = f"act_{ad_account_id}/campaigns" if not ad_account_id.startswith("act_") else f"{ad_account_id}/campaigns"
        result = await self._post(endpoint, params=data)
        logger.info("Campaign created: id=%s", result.get("id"))
        return result

    async def create_ad_set(self, ad_account_id: str, data: dict) -> dict:
        """Create an ad set within a campaign.

        POST /act_{ad_account_id}/adsets
        """
        logger.info("Creating ad set on ad account %s", ad_account_id)
        endpoint = f"act_{ad_account_id}/adsets" if not ad_account_id.startswith("act_") else f"{ad_account_id}/adsets"
        result = await self._post(endpoint, params=data)
        logger.info("Ad set created: id=%s", result.get("id"))
        return result

    async def create_ad(self, ad_account_id: str, data: dict) -> dict:
        """Create an ad within an ad set.

        POST /act_{ad_account_id}/ads
        """
        logger.info("Creating ad on ad account %s", ad_account_id)
        endpoint = f"act_{ad_account_id}/ads" if not ad_account_id.startswith("act_") else f"{ad_account_id}/ads"
        result = await self._post(endpoint, params=data)
        logger.info("Ad created: id=%s", result.get("id"))
        return result

    async def get_ad_insights(self, ad_id: str, fields: list[str]) -> dict:
        """Fetch performance insights for a specific ad.

        GET /{ad_id}/insights?fields=f1,f2,...
        """
        result = await self._get(
            f"{ad_id}/insights",
            fields=",".join(fields),
        )
        # The insights endpoint returns data in a `data` array; return first entry
        data = result.get("data", [])
        return data[0] if data else result

    async def pause_ad(self, ad_id: str) -> dict:
        """Pause a running ad by setting its status to PAUSED.

        POST /{ad_id}  with status=PAUSED
        """
        logger.info("Pausing ad %s", ad_id)
        result = await self._post(ad_id, params={"status": "PAUSED"})
        return {"ad_id": ad_id, "status": "PAUSED", "success": result.get("success", True)}

    async def update_ad_budget(self, ad_set_id: str, new_budget: float) -> dict:
        """Update the daily budget on an ad set.

        POST /{ad_set_id}  with daily_budget=<cents>
        The Meta API expects budget in the smallest currency unit (e.g. cents).
        """
        logger.info("Updating budget for ad set %s to %.2f", ad_set_id, new_budget)
        # Meta expects budget in cents (integer)
        budget_cents = int(round(new_budget * 100))
        result = await self._post(
            ad_set_id,
            params={"daily_budget": str(budget_cents)},
        )
        return {
            "ad_set_id": ad_set_id,
            "daily_budget": new_budget,
            "success": result.get("success", True),
        }
