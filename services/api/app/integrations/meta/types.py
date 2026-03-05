from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class PageInsight(TypedDict):
    name: str
    period: str
    values: list[dict]
    title: str
    description: str


class InstagramInsight(TypedDict):
    name: str
    period: str
    values: list[dict]


class InstagramMedia(TypedDict):
    id: str
    caption: str
    media_type: str
    media_url: str
    timestamp: str
    like_count: int
    comments_count: int
    permalink: str


class AudienceDemographics(TypedDict):
    age_gender: dict[str, float]
    country: dict[str, float]
    city: dict[str, float]


@dataclass
class MetaCampaign:
    id: str
    name: str
    status: str
    objective: str
    daily_budget: float | None = None
    lifetime_budget: float | None = None
    created_time: str = ""


@dataclass
class MetaAdSet:
    id: str
    name: str
    campaign_id: str
    status: str
    daily_budget: float
    targeting: dict = field(default_factory=dict)
    start_time: str = ""
    end_time: str = ""


@dataclass
class MetaAd:
    id: str
    name: str
    adset_id: str
    status: str
    creative: dict = field(default_factory=dict)


@dataclass
class AdInsight:
    impressions: int = 0
    clicks: int = 0
    spend: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0
    ctr: float = 0.0
    reach: int = 0
    conversions: int = 0
    cost_per_conversion: float = 0.0
    date_start: str = ""
    date_stop: str = ""
