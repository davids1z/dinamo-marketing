"""Campaign / ad-management schemas for the ShiftOneZero Marketing Platform API."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CampaignOut(BaseModel):
    """Read-only representation of a paid-media campaign."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    platform: str
    market_id: Optional[UUID] = None
    objective: str = Field(
        description="Campaign objective, e.g. awareness, engagement, conversions"
    )
    status: str = Field(description="Campaign status, e.g. draft, active, paused, completed")
    daily_budget: Optional[float] = Field(default=None, ge=0.0)
    max_budget: Optional[float] = Field(default=None, ge=0.0)
    total_spend: float = Field(default=0.0, ge=0.0)


class CampaignCreate(BaseModel):
    """Payload for creating a new campaign."""

    model_config = ConfigDict(from_attributes=True)

    name: str = Field(min_length=1, max_length=255)
    platform: str
    market_id: Optional[UUID] = None
    objective: str
    daily_budget: Optional[float] = Field(default=None, ge=0.0)
    max_budget: Optional[float] = Field(default=None, ge=0.0)
    base_copy: Optional[str] = Field(
        default=None, description="Base ad-copy text for AI variant generation"
    )
    targeting: Optional[dict] = Field(
        default=None, description="Targeting parameters (interests, geo, demographics)"
    )


class AdSetOut(BaseModel):
    """Read-only representation of an ad set within a campaign."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_id: UUID
    name: str
    targeting: Optional[dict] = None
    status: str
    budget: Optional[float] = Field(default=None, ge=0.0)


class AdOut(BaseModel):
    """Read-only representation of an individual ad creative."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ad_set_id: UUID
    variant_label: Optional[str] = Field(
        default=None, description="A/B variant label, e.g. A, B, C"
    )
    headline: Optional[str] = None
    description: Optional[str] = None
    cta: Optional[str] = Field(default=None, description="Call-to-action button text")
    status: str


class ABTestOut(BaseModel):
    """Read-only representation of an A/B test result."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_id: UUID
    status: str = Field(description="Test status, e.g. running, completed, cancelled")
    winner_ad_id: Optional[UUID] = None
    confidence_pct: Optional[float] = Field(
        default=None, ge=0.0, le=100.0, description="Statistical confidence percentage"
    )
    decision_reason: Optional[str] = None
