"""Mock Google Trends client returning realistic search interest data."""

from __future__ import annotations

from app.integrations.base import TrendsClientBase


class TrendsMockClient(TrendsClientBase):
    """Returns hardcoded but realistic Google Trends-like data for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "google_trends", "mock": True}

    async def get_interest_by_region(self, keywords: list[str], geo: str = "", timeframe: str = "today 12-m") -> dict:
        # Build region interest for each keyword
        regions_data: dict[str, list[dict]] = {}
        keyword_base_values = {
            "shiftonezero": [
                {"geo_name": "Croatia", "geo_code": "HR", "value": 100},
                {"geo_name": "Bosnia and Herzegovina", "geo_code": "BA", "value": 42},
                {"geo_name": "Slovenia", "geo_code": "SI", "value": 28},
                {"geo_name": "Serbia", "geo_code": "RS", "value": 22},
                {"geo_name": "Austria", "geo_code": "AT", "value": 15},
                {"geo_name": "Germany", "geo_code": "DE", "value": 12},
                {"geo_name": "Switzerland", "geo_code": "CH", "value": 8},
                {"geo_name": "United States", "geo_code": "US", "value": 3},
            ],
        }
        for kw in keywords:
            kw_lower = kw.lower()
            if kw_lower in keyword_base_values:
                regions_data[kw] = keyword_base_values[kw_lower]
            else:
                # Generate plausible data for unknown keywords
                regions_data[kw] = [
                    {"geo_name": "Croatia", "geo_code": "HR", "value": 75},
                    {"geo_name": "Germany", "geo_code": "DE", "value": 30},
                    {"geo_name": "United States", "geo_code": "US", "value": 18},
                    {"geo_name": "United Kingdom", "geo_code": "GB", "value": 15},
                    {"geo_name": "Austria", "geo_code": "AT", "value": 12},
                    {"geo_name": "France", "geo_code": "FR", "value": 8},
                ]

        return {
            "keywords": keywords,
            "geo": geo,
            "timeframe": timeframe,
            "data": regions_data,
        }

    async def get_interest_over_time(self, keywords: list[str], geo: str = "", timeframe: str = "today 12-m") -> dict:
        # Generate 12 months of weekly data points (simplified to monthly here)
        months = [
            "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09",
            "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
        ]

        # Base interest patterns - football has seasonal peaks
        base_patterns = {
            "shiftonezero": [35, 22, 15, 18, 42, 55, 62, 58, 48, 52, 68, 100],
            "brand marketing":           [30, 18, 10, 12, 38, 50, 55, 52, 42, 48, 60, 85],
            "spring campaign": [20, 15, 8,  5,  12, 45, 52, 48, 38, 42, 55, 95],
        }

        time_series: list[dict] = []
        for i, month in enumerate(months):
            values: dict[str, int] = {}
            for kw in keywords:
                kw_lower = kw.lower()
                if kw_lower in base_patterns:
                    values[kw] = base_patterns[kw_lower][i]
                else:
                    # Generate a generic seasonal pattern
                    generic = [25, 20, 15, 18, 30, 40, 45, 42, 35, 38, 50, 65]
                    values[kw] = generic[i]
            time_series.append({
                "date": month,
                "values": values,
                "is_partial": (month == "2026-03"),
            })

        return {
            "keywords": keywords,
            "geo": geo,
            "timeframe": timeframe,
            "data": time_series,
        }
