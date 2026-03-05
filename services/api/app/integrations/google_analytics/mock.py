"""Mock Google Analytics 4 client returning realistic website analytics data."""

from __future__ import annotations

from app.integrations.base import GA4ClientBase


class GA4MockClient(GA4ClientBase):
    """Returns hardcoded but realistic GA4 data for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "google_analytics_4", "mock": True}

    async def get_report(self, property_id: str, metrics: list[str], dimensions: list[str], date_range: dict) -> dict:
        sample_rows = [
            {
                "dimension_values": [
                    {"dimension_name": "date", "value": "20260304"},
                    {"dimension_name": "sessionSource", "value": "google"},
                ],
                "metric_values": [
                    {"metric_name": "activeUsers", "value": 4_820},
                    {"metric_name": "sessions", "value": 6_130},
                    {"metric_name": "bounceRate", "value": 0.42},
                ],
            },
            {
                "dimension_values": [
                    {"dimension_name": "date", "value": "20260304"},
                    {"dimension_name": "sessionSource", "value": "instagram"},
                ],
                "metric_values": [
                    {"metric_name": "activeUsers", "value": 2_310},
                    {"metric_name": "sessions", "value": 2_780},
                    {"metric_name": "bounceRate", "value": 0.38},
                ],
            },
            {
                "dimension_values": [
                    {"dimension_name": "date", "value": "20260304"},
                    {"dimension_name": "sessionSource", "value": "direct"},
                ],
                "metric_values": [
                    {"metric_name": "activeUsers", "value": 1_950},
                    {"metric_name": "sessions", "value": 2_410},
                    {"metric_name": "bounceRate", "value": 0.35},
                ],
            },
            {
                "dimension_values": [
                    {"dimension_name": "date", "value": "20260304"},
                    {"dimension_name": "sessionSource", "value": "facebook"},
                ],
                "metric_values": [
                    {"metric_name": "activeUsers", "value": 1_120},
                    {"metric_name": "sessions", "value": 1_340},
                    {"metric_name": "bounceRate", "value": 0.45},
                ],
            },
        ]
        return {
            "property_id": property_id,
            "rows": sample_rows,
            "row_count": len(sample_rows),
            "metadata": {
                "date_range": date_range,
                "requested_metrics": metrics,
                "requested_dimensions": dimensions,
            },
        }

    async def get_realtime_report(self, property_id: str) -> dict:
        return {
            "property_id": property_id,
            "active_users": 247,
            "rows": [
                {
                    "dimension_values": [{"dimension_name": "unifiedScreenName", "value": "/"}],
                    "metric_values": [{"metric_name": "activeUsers", "value": 82}],
                },
                {
                    "dimension_values": [{"dimension_name": "unifiedScreenName", "value": "/tickets"}],
                    "metric_values": [{"metric_name": "activeUsers", "value": 54}],
                },
                {
                    "dimension_values": [{"dimension_name": "unifiedScreenName", "value": "/shop"}],
                    "metric_values": [{"metric_name": "activeUsers", "value": 41}],
                },
                {
                    "dimension_values": [{"dimension_name": "unifiedScreenName", "value": "/news/derby-recap"}],
                    "metric_values": [{"metric_name": "activeUsers", "value": 38}],
                },
                {
                    "dimension_values": [{"dimension_name": "unifiedScreenName", "value": "/squad"}],
                    "metric_values": [{"metric_name": "activeUsers", "value": 32}],
                },
            ],
        }

    async def get_audience_overview(self, property_id: str, date_range: dict) -> dict:
        return {
            "property_id": property_id,
            "total_users": 180_000,
            "new_users": 62_400,
            "sessions": 312_500,
            "bounce_rate": 42.0,
            "avg_session_duration": 185.4,
            "pages_per_session": 3.2,
            "top_pages": [
                {"page": "/", "views": 98_200, "avg_time_on_page": 45.2},
                {"page": "/tickets", "views": 54_300, "avg_time_on_page": 120.5},
                {"page": "/shop", "views": 41_800, "avg_time_on_page": 95.3},
                {"page": "/news", "views": 38_700, "avg_time_on_page": 67.8},
                {"page": "/squad", "views": 27_400, "avg_time_on_page": 82.1},
                {"page": "/matches", "views": 24_600, "avg_time_on_page": 110.2},
                {"page": "/about", "views": 12_100, "avg_time_on_page": 55.4},
            ],
            "top_sources": [
                {"source": "google", "users": 68_400, "percentage": 38.0},
                {"source": "direct", "users": 39_600, "percentage": 22.0},
                {"source": "instagram", "users": 27_000, "percentage": 15.0},
                {"source": "facebook", "users": 18_000, "percentage": 10.0},
                {"source": "tiktok", "users": 10_800, "percentage": 6.0},
                {"source": "twitter", "users": 7_200, "percentage": 4.0},
                {"source": "other", "users": 9_000, "percentage": 5.0},
            ],
            "top_countries": [
                {"country": "Croatia", "users": 86_400, "percentage": 48.0},
                {"country": "Bosnia and Herzegovina", "users": 19_800, "percentage": 11.0},
                {"country": "Germany", "users": 16_200, "percentage": 9.0},
                {"country": "Serbia", "users": 12_600, "percentage": 7.0},
                {"country": "Austria", "users": 10_800, "percentage": 6.0},
                {"country": "United States", "users": 7_200, "percentage": 4.0},
                {"country": "Slovenia", "users": 5_400, "percentage": 3.0},
                {"country": "Other", "users": 21_600, "percentage": 12.0},
            ],
            "device_breakdown": {
                "mobile": 58.4,
                "desktop": 31.2,
                "tablet": 7.1,
                "other": 3.3,
            },
        }
