"""Content-planning schemas for the Dinamo Zagreb Marketing Platform API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ContentPlanOut(BaseModel):
    """Read-only representation of a monthly content plan."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2020)
    status: str = Field(description="Plan status, e.g. draft, in_review, approved")
    total_posts: int = Field(ge=0)
    approved_count: int = Field(ge=0)


class ContentPostOut(BaseModel):
    """Read-only representation of a single scheduled content post."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plan_id: UUID
    platform: str
    content_pillar: Optional[str] = Field(
        default=None,
        description="Content pillar, e.g. match_day, behind_the_scenes, community",
    )
    scheduled_at: Optional[datetime] = None
    status: str = Field(description="Post status, e.g. draft, scheduled, published")
    caption_hr: Optional[str] = Field(default=None, description="Caption in Croatian")
    caption_en: Optional[str] = Field(default=None, description="Caption in English")
    caption_de: Optional[str] = Field(default=None, description="Caption in German")
    hashtags: Optional[list[str]] = Field(default=None)
    cta_text: Optional[str] = Field(default=None, description="Call-to-action text")
    is_champions_league: bool = False
    is_academy: bool = False


class ContentPostCreate(BaseModel):
    """Payload for creating or updating a content post."""

    model_config = ConfigDict(from_attributes=True)

    platform: str
    content_pillar: Optional[str] = None
    caption_hr: Optional[str] = None
    caption_en: Optional[str] = None
    caption_de: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    hashtags: Optional[list[str]] = None
    cta_text: Optional[str] = None
    is_champions_league: bool = False
    is_academy: bool = False


class ApprovalActionIn(BaseModel):
    """Payload for approving or rejecting a content post."""

    model_config = ConfigDict(from_attributes=True)

    action: str = Field(
        pattern="^(approve|reject)$",
        description="Must be 'approve' or 'reject'",
    )
    comment: Optional[str] = None


class PlanGenerateRequest(BaseModel):
    """Request body for AI-assisted content-plan generation."""

    model_config = ConfigDict(from_attributes=True)

    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2020)
    context: Optional[dict] = Field(
        default=None,
        description="Additional context for the AI planner (fixtures, campaigns, etc.)",
    )


class TemplateOut(BaseModel):
    """Read-only representation of a content template."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: str
    name: str
    platform: str
    format_type: str = Field(description="Format type, e.g. image, video, carousel, story")
