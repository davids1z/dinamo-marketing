"""Fan-engagement schemas for the ShiftOneZero Marketing Platform API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PollOut(BaseModel):
    """Read-only representation of a fan poll."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question: str
    options: list[str]
    platform: str
    status: str = Field(description="Poll status, e.g. draft, active, closed")
    total_votes: int = Field(default=0, ge=0)


class PollCreate(BaseModel):
    """Payload for creating a new fan poll."""

    model_config = ConfigDict(from_attributes=True)

    question: str = Field(min_length=1)
    options: list[str] = Field(min_length=2, description="At least two answer options")
    platform: str


class VoteIn(BaseModel):
    """Payload for casting a vote on a poll."""

    model_config = ConfigDict(from_attributes=True)

    option_index: int = Field(ge=0, description="Zero-based index of the selected option")
    fan_id: Optional[UUID] = Field(
        default=None, description="Fan UUID if authenticated"
    )


class UGCSubmissionOut(BaseModel):
    """Read-only representation of a user-generated content submission."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_hashtag: str
    platform: str
    author: Optional[str] = None
    content_url: str
    sentiment: Optional[str] = None
    is_featured: bool = False


class UGCSubmitIn(BaseModel):
    """Payload for submitting user-generated content."""

    model_config = ConfigDict(from_attributes=True)

    campaign_hashtag: str
    platform: str
    author: Optional[str] = None
    content_url: str = Field(description="URL of the submitted content")


class FanLeaderboardEntry(BaseModel):
    """A single row on the fan-engagement leaderboard."""

    model_config = ConfigDict(from_attributes=True)

    rank: int = Field(ge=1)
    fan_id: UUID
    name: Optional[str] = None
    score: float = Field(ge=0.0)
    badge: Optional[str] = Field(
        default=None, description="Badge earned, e.g. gold, silver, bronze"
    )
