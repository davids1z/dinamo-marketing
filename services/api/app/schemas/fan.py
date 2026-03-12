"""Fan / CRM schemas for the ShiftOneZero Marketing Platform API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FanProfileOut(BaseModel):
    """Read-only representation of a fan profile."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    lifecycle_stage: Optional[str] = Field(
        default=None,
        description="Current lifecycle stage, e.g. casual, engaged, super_fan, dormant",
    )
    clv_score: Optional[float] = Field(
        default=None, ge=0.0, description="Customer lifetime value score"
    )
    last_active: Optional[datetime] = None


class FanSegmentOut(BaseModel):
    """Aggregated fan segment summary."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    size: int = Field(ge=0, description="Number of fans in segment")
    avg_clv: Optional[float] = Field(default=None, ge=0.0)
    churn_rate: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="Fraction of fans churning"
    )
    growth_trend: Optional[float] = Field(
        default=None, description="Growth rate as fraction, e.g. 0.05 = 5%"
    )


class LifecycleEventOut(BaseModel):
    """Record of a fan transitioning between lifecycle stages."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    fan_id: UUID
    from_stage: Optional[str] = None
    to_stage: str
    trigger: Optional[str] = Field(
        default=None, description="What caused the transition"
    )
    occurred_at: datetime


class ChurnPrediction(BaseModel):
    """Churn-risk prediction for a fan segment."""

    model_config = ConfigDict(from_attributes=True)

    segment: str
    risk_level: str = Field(description="low, medium, or high")
    count: int = Field(ge=0, description="Number of fans at this risk level")
    recommended_action: Optional[str] = Field(
        default=None, description="AI-suggested action to reduce churn"
    )
