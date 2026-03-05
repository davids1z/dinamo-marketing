"""Social-channel schemas for the Dinamo Zagreb Marketing Platform API."""

from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SocialChannelOut(BaseModel):
    """Read-only representation of a social-media channel."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str = Field(description="Platform name, e.g. instagram, facebook, x, tiktok")
    handle: str = Field(description="Account handle / username")
    owner_type: str = Field(description="Owner category, e.g. club, academy, foundation")


class ChannelMetricOut(BaseModel):
    """Point-in-time metric snapshot for a social channel."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    channel_id: UUID
    date: date
    followers: int = Field(ge=0)
    avg_reach: Optional[int] = Field(default=None, ge=0)
    engagement_rate: Optional[float] = Field(default=None, ge=0.0)
    posting_frequency: Optional[float] = Field(
        default=None, ge=0.0, description="Average posts per day"
    )


class ChannelHealthScoreOut(BaseModel):
    """Derived health score for a channel."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    channel_id: UUID
    overall_score: float = Field(ge=0.0, le=100.0)
    growth_score: float = Field(ge=0.0, le=100.0)
    engagement_score: float = Field(ge=0.0, le=100.0)


class AuditResponse(BaseModel):
    """Aggregated channel-audit response."""

    model_config = ConfigDict(from_attributes=True)

    channels: list[ChannelMetricOut]
    health_scores: list[ChannelHealthScoreOut]
