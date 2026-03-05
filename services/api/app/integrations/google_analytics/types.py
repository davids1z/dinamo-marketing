from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class GA4MetricValue(TypedDict):
    metric_name: str
    value: str | float


class GA4DimensionValue(TypedDict):
    dimension_name: str
    value: str


class GA4Row(TypedDict):
    dimension_values: list[GA4DimensionValue]
    metric_values: list[GA4MetricValue]


class GA4Report(TypedDict):
    property_id: str
    rows: list[GA4Row]
    row_count: int
    metadata: dict


class GA4RealtimeReport(TypedDict):
    property_id: str
    active_users: int
    rows: list[GA4Row]


class GA4AudienceOverview(TypedDict):
    property_id: str
    total_users: int
    new_users: int
    sessions: int
    bounce_rate: float
    avg_session_duration: float
    pages_per_session: float
    top_pages: list[dict]
    top_sources: list[dict]
    top_countries: list[dict]
    device_breakdown: dict[str, float]


@dataclass
class GA4DateRange:
    start_date: str
    end_date: str


@dataclass
class GA4PropertySummary:
    property_id: str
    display_name: str
    total_users_30d: int = 0
    total_sessions_30d: int = 0
    bounce_rate: float = 0.0
    avg_session_duration_seconds: float = 0.0
