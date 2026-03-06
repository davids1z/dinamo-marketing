"""Real Google Analytics 4 Data API client.

Uses the GA4 Data API v1beta via httpx. Supports service account
authentication via JSON key file or JSON string.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone

import httpx

from app.integrations.base import GA4ClientBase

logger = logging.getLogger(__name__)

GA4_BASE = "https://analyticsdata.googleapis.com/v1beta"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = "https://www.googleapis.com/auth/analytics.readonly"


class GA4Client(GA4ClientBase):
    """Production Google Analytics 4 Data API client."""

    def __init__(
        self,
        property_id: str = "",
        credentials_json: str = "",
    ):
        self._property_id = property_id
        self._credentials_json = credentials_json
        self._client: httpx.AsyncClient | None = None
        self._access_token: str = ""
        self._token_expiry: float = 0

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _ensure_token(self) -> str:
        """Get or refresh OAuth2 access token using service account JWT."""
        if self._access_token and time.time() < self._token_expiry - 60:
            return self._access_token

        if not self._credentials_json:
            raise RuntimeError("GA4_CREDENTIALS_JSON not configured")

        try:
            creds = json.loads(self._credentials_json)
        except json.JSONDecodeError:
            # Might be a file path
            with open(self._credentials_json) as f:
                creds = json.load(f)

        # Build JWT for service account
        import base64
        import hashlib

        now = int(time.time())
        header = base64.urlsafe_b64encode(
            json.dumps({"alg": "RS256", "typ": "JWT"}).encode()
        ).rstrip(b"=").decode()

        payload = base64.urlsafe_b64encode(json.dumps({
            "iss": creds["client_email"],
            "scope": SCOPES,
            "aud": TOKEN_URL,
            "iat": now,
            "exp": now + 3600,
        }).encode()).rstrip(b"=").decode()

        # Sign with private key
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        private_key = serialization.load_pem_private_key(
            creds["private_key"].encode(), password=None
        )
        signature = private_key.sign(
            f"{header}.{payload}".encode(),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
        jwt_token = f"{header}.{payload}.{sig_b64}"

        # Exchange JWT for access token
        client = self._get_client()
        resp = await client.post(TOKEN_URL, data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": jwt_token,
        })

        if resp.status_code != 200:
            raise RuntimeError(f"GA4 token exchange failed: {resp.status_code} {resp.text[:300]}")

        token_data = resp.json()
        self._access_token = token_data["access_token"]
        self._token_expiry = now + token_data.get("expires_in", 3600)
        return self._access_token

    async def _request(self, method: str, url: str, **kwargs) -> dict:
        token = await self._ensure_token()
        client = self._get_client()
        resp = await client.request(
            method, url,
            headers={"Authorization": f"Bearer {token}"},
            **kwargs,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"GA4 API error {resp.status_code}: {resp.text[:500]}")
        return resp.json()

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def health_check(self) -> dict:
        try:
            await self._ensure_token()
            return {"status": "ok", "platform": "google_analytics_4", "mock": False}
        except Exception as e:
            return {"status": "error", "platform": "google_analytics_4", "error": str(e)}

    async def get_report(
        self,
        property_id: str,
        metrics: list[str],
        dimensions: list[str],
        date_range: dict,
    ) -> dict:
        prop = property_id or self._property_id
        url = f"{GA4_BASE}/properties/{prop}:runReport"

        body = {
            "dateRanges": [date_range],
            "metrics": [{"name": m} for m in metrics],
            "dimensions": [{"name": d} for d in dimensions],
        }

        data = await self._request("POST", url, json=body)

        rows = []
        for row in data.get("rows", []):
            rows.append({
                "dimension_values": [
                    {"dimension_name": d["name"], "value": dv.get("value", "")}
                    for d, dv in zip(
                        data.get("dimensionHeaders", []),
                        row.get("dimensionValues", []),
                    )
                ],
                "metric_values": [
                    {"metric_name": m["name"], "value": mv.get("value", "")}
                    for m, mv in zip(
                        data.get("metricHeaders", []),
                        row.get("metricValues", []),
                    )
                ],
            })

        return {
            "property_id": prop,
            "rows": rows,
            "row_count": len(rows),
            "metadata": {
                "date_range": date_range,
                "requested_metrics": metrics,
                "requested_dimensions": dimensions,
            },
        }

    async def get_realtime_report(self, property_id: str) -> dict:
        prop = property_id or self._property_id
        url = f"{GA4_BASE}/properties/{prop}:runRealtimeReport"

        body = {
            "metrics": [{"name": "activeUsers"}],
            "dimensions": [{"name": "unifiedScreenName"}],
        }

        data = await self._request("POST", url, json=body)

        total_users = 0
        rows = []
        for row in data.get("rows", []):
            dim_val = row.get("dimensionValues", [{}])[0].get("value", "")
            met_val = int(row.get("metricValues", [{}])[0].get("value", "0"))
            total_users += met_val
            rows.append({
                "dimension_values": [{"dimension_name": "unifiedScreenName", "value": dim_val}],
                "metric_values": [{"metric_name": "activeUsers", "value": met_val}],
            })

        return {
            "property_id": prop,
            "active_users": total_users,
            "rows": rows,
        }

    async def get_audience_overview(self, property_id: str, date_range: dict) -> dict:
        prop = property_id or self._property_id

        # Main metrics report
        main = await self.get_report(
            prop,
            metrics=["totalUsers", "newUsers", "sessions", "bounceRate",
                     "averageSessionDuration", "screenPageViewsPerSession"],
            dimensions=[],
            date_range=date_range,
        )

        # Source breakdown
        sources = await self.get_report(
            prop,
            metrics=["totalUsers"],
            dimensions=["sessionSource"],
            date_range=date_range,
        )

        # Country breakdown
        countries = await self.get_report(
            prop,
            metrics=["totalUsers"],
            dimensions=["country"],
            date_range=date_range,
        )

        # Parse main metrics
        main_row = main["rows"][0] if main["rows"] else None
        total_users = int(main_row["metric_values"][0]["value"]) if main_row else 0

        return {
            "property_id": prop,
            "total_users": total_users,
            "new_users": int(main_row["metric_values"][1]["value"]) if main_row else 0,
            "sessions": int(main_row["metric_values"][2]["value"]) if main_row else 0,
            "bounce_rate": float(main_row["metric_values"][3]["value"]) if main_row else 0,
            "avg_session_duration": float(main_row["metric_values"][4]["value"]) if main_row else 0,
            "pages_per_session": float(main_row["metric_values"][5]["value"]) if main_row else 0,
            "top_sources": [
                {
                    "source": r["dimension_values"][0]["value"],
                    "users": int(r["metric_values"][0]["value"]),
                    "percentage": round(int(r["metric_values"][0]["value"]) / max(total_users, 1) * 100, 1),
                }
                for r in sources.get("rows", [])[:10]
            ],
            "top_countries": [
                {
                    "country": r["dimension_values"][0]["value"],
                    "users": int(r["metric_values"][0]["value"]),
                    "percentage": round(int(r["metric_values"][0]["value"]) / max(total_users, 1) * 100, 1),
                }
                for r in countries.get("rows", [])[:10]
            ],
        }
