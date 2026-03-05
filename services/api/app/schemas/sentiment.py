"""Sentiment-analysis schemas for the Dinamo Zagreb Marketing Platform API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SentimentRecordOut(BaseModel):
    """A single sentiment-analysed text record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_type: str = Field(description="Source type, e.g. comment, mention, review")
    platform: str
    text: str
    language: Optional[str] = Field(default=None, description="ISO 639-1 language code")
    sentiment: str = Field(description="Sentiment label: positive, neutral, or negative")
    confidence: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="Model confidence score"
    )
    topics: Optional[list[str]] = Field(
        default=None, description="Extracted topic tags"
    )


class SentimentAlertOut(BaseModel):
    """Alert triggered by a sentiment anomaly or threshold breach."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    alert_type: str = Field(
        description="Alert category, e.g. negative_spike, trending_complaint"
    )
    severity: str = Field(description="Severity level: low, medium, high, critical")
    description: str
    triggered_at: datetime
    is_resolved: bool = False


class BrandMentionOut(BaseModel):
    """External brand mention detected across platforms."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    author: Optional[str] = None
    text: str
    sentiment: Optional[str] = None
    reach_estimate: Optional[int] = Field(default=None, ge=0)
    is_influencer: bool = False
    detected_at: datetime


class TrendingTopicOut(BaseModel):
    """A trending topic related to the club."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic: str
    volume: int = Field(ge=0, description="Number of mentions")
    growth_rate: Optional[float] = Field(
        default=None, description="Growth rate as fraction"
    )


class SentimentOverview(BaseModel):
    """Aggregate sentiment breakdown."""

    model_config = ConfigDict(from_attributes=True)

    positive: int = Field(ge=0)
    neutral: int = Field(ge=0)
    negative: int = Field(ge=0)
    total: int = Field(ge=0)
    positive_pct: float = Field(ge=0.0, le=100.0)
    negative_pct: float = Field(ge=0.0, le=100.0)


class AnalyzeRequest(BaseModel):
    """Request body for on-demand sentiment analysis."""

    model_config = ConfigDict(from_attributes=True)

    comments: list[dict] = Field(
        description="List of comment objects to analyse (must contain 'text' key)"
    )
