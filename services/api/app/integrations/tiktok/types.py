from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class TikTokAccountInfo(TypedDict):
    open_id: str
    union_id: str
    display_name: str
    avatar_url: str
    follower_count: int
    following_count: int
    likes_count: int
    video_count: int
    bio_description: str
    is_verified: bool


class TikTokVideo(TypedDict):
    id: str
    title: str
    description: str
    cover_image_url: str
    share_url: str
    create_time: int
    duration: int
    like_count: int
    comment_count: int
    share_count: int
    view_count: int


class TikTokVideoInsight(TypedDict):
    video_id: str
    total_views: int
    total_likes: int
    total_comments: int
    total_shares: int
    average_watch_time: float
    full_video_watched_rate: float
    reach: int
    impression_sources: dict[str, float]


@dataclass
class TikTokCampaign:
    campaign_id: str
    campaign_name: str
    status: str
    objective_type: str
    budget: float
    budget_mode: str = "BUDGET_MODE_DAY"


@dataclass
class TikTokAdGroup:
    adgroup_id: str
    campaign_id: str
    adgroup_name: str
    status: str
    placement_type: str = "PLACEMENT_TYPE_AUTOMATIC"
    budget: float = 0.0
    schedule_type: str = "SCHEDULE_FROM_NOW"


@dataclass
class TikTokAd:
    ad_id: str
    adgroup_id: str
    ad_name: str
    status: str
    ad_format: str = "SINGLE_VIDEO"
    creative: dict = field(default_factory=dict)


@dataclass
class TikTokAdInsight:
    ad_id: str
    impressions: int = 0
    clicks: int = 0
    spend: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0
    ctr: float = 0.0
    conversions: int = 0
    cost_per_conversion: float = 0.0
    video_views_p25: int = 0
    video_views_p50: int = 0
    video_views_p75: int = 0
    video_views_p100: int = 0
