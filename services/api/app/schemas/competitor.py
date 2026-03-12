"""Competitor-intelligence schemas for the Marketing Platform API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CompetitorOut(BaseModel):
    """Read-only representation of a competitor club."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    short_name: Optional[str] = None
    country: Optional[str] = None
    league: Optional[str] = None


class CompetitorMetricOut(BaseModel):
    """Latest social-media metrics for a competitor on a given platform."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    competitor_id: UUID
    platform: str
    followers: int = Field(ge=0)
    engagement_rate: Optional[float] = Field(default=None, ge=0.0)


class CompetitorAlertOut(BaseModel):
    """Alert generated when a competitor has notable activity."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    competitor_id: UUID
    alert_type: str = Field(description="Alert category, e.g. spike, campaign_launch")
    description: str
    engagement_spike: Optional[float] = Field(
        default=None, description="Percentage spike in engagement"
    )
    detected_at: datetime
    is_read: bool = False


class ComparisonResponse(BaseModel):
    """Side-by-side comparison of own brand vs competitors."""

    model_config = ConfigDict(from_attributes=True)

    own_brand: list[CompetitorMetricOut] = Field(
        description="Own brand metrics across platforms"
    )
    competitors: list[CompetitorMetricOut] = Field(
        description="Competitor metrics across platforms"
    )
