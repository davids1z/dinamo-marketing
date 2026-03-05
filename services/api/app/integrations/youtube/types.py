from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict


class ChannelStats(TypedDict):
    channel_id: str
    title: str
    description: str
    subscriber_count: int
    video_count: int
    view_count: int
    custom_url: str
    thumbnail_url: str
    published_at: str


class VideoItem(TypedDict):
    video_id: str
    title: str
    description: str
    published_at: str
    thumbnail_url: str
    duration: str
    view_count: int
    like_count: int
    comment_count: int
    tags: list[str]


class VideoStats(TypedDict):
    video_id: str
    view_count: int
    like_count: int
    comment_count: int
    favorite_count: int
    average_view_duration: str
    average_view_percentage: float
    estimated_minutes_watched: int
    card_click_rate: float
    annotation_click_through_rate: float


class YouTubeAudienceDemographics(TypedDict):
    age_group: dict[str, float]
    gender: dict[str, float]
    country: dict[str, float]
    device_type: dict[str, float]
    traffic_source: dict[str, float]


@dataclass
class YouTubeChannelOverview:
    subscribers: int = 0
    total_views: int = 0
    avg_views_per_video: int = 0
    avg_watch_time_minutes: float = 0.0
    subscriber_growth_30d: int = 0
    top_traffic_source: str = ""
