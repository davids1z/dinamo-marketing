"""Analytics schemas for the Dinamo Zagreb Marketing Platform API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PostMetricOut(BaseModel):
    """Engagement metrics for an organic content post."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    post_id: UUID
    timestamp: datetime
    impressions: int = Field(ge=0)
    reach: int = Field(ge=0)
    likes: int = Field(ge=0)
    comments: int = Field(ge=0)
    shares: int = Field(ge=0)
    saves: int = Field(ge=0)
    engagement_rate: Optional[float] = Field(default=None, ge=0.0)


class AdMetricOut(BaseModel):
    """Performance metrics for a paid ad."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ad_id: UUID
    timestamp: datetime
    impressions: int = Field(ge=0)
    clicks: int = Field(ge=0)
    ctr: Optional[float] = Field(default=None, ge=0.0, description="Click-through rate")
    cpc: Optional[float] = Field(default=None, ge=0.0, description="Cost per click")
    spend: float = Field(ge=0.0)
    conversions: int = Field(default=0, ge=0)
    roas: Optional[float] = Field(
        default=None, description="Return on ad spend"
    )
    frequency: Optional[float] = Field(
        default=None, ge=0.0, description="Average impressions per user"
    )


class AttributionEventOut(BaseModel):
    """Multi-touch attribution event linking a fan to a conversion."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    fan_id: UUID
    first_touch_channel: Optional[str] = None
    last_touch_channel: Optional[str] = None
    conversion_type: Optional[str] = Field(
        default=None,
        description="Conversion type, e.g. ticket_purchase, merch, membership",
    )
    conversion_value: Optional[float] = Field(default=None, ge=0.0)


class OverviewKPIs(BaseModel):
    """High-level dashboard KPIs across all platforms."""

    model_config = ConfigDict(from_attributes=True)

    total_followers: int = Field(ge=0)
    monthly_reach: int = Field(ge=0)
    engagement_rate: Optional[float] = Field(default=None, ge=0.0)
    ad_spend: float = Field(ge=0.0)
    avg_roas: Optional[float] = None
    sentiment_score: Optional[float] = Field(
        default=None, ge=-1.0, le=1.0, description="Aggregate sentiment (-1 to 1)"
    )


class PlatformBreakdown(BaseModel):
    """Per-platform summary metrics."""

    model_config = ConfigDict(from_attributes=True)

    platform: str
    followers: int = Field(ge=0)
    reach: int = Field(ge=0)
    engagement_rate: Optional[float] = Field(default=None, ge=0.0)
    growth: Optional[float] = Field(
        default=None, description="Follower growth rate as fraction"
    )
