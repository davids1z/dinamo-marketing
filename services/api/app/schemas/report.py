"""Reporting schemas for the Dinamo Zagreb Marketing Platform API."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WeeklyReportOut(BaseModel):
    """Read-only representation of a generated weekly report."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    week_start: date
    week_end: date
    data: dict = Field(description="Aggregated weekly KPI data")
    top_posts: Optional[list[dict]] = Field(
        default=None, description="Best-performing organic posts"
    )
    top_ads: Optional[list[dict]] = Field(
        default=None, description="Best-performing paid ads"
    )
    recommendations: Optional[list[str]] = Field(
        default=None, description="AI-generated strategic recommendations"
    )
    generated_at: datetime


class MonthlyReportOut(BaseModel):
    """Read-only representation of a generated monthly report."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2020)
    data: dict = Field(description="Aggregated monthly KPI data")
    competitor_comparison: Optional[dict] = Field(
        default=None, description="Competitor benchmarking data"
    )
    ai_strategy: Optional[str] = Field(
        default=None, description="AI-generated strategic narrative"
    )
    pdf_url: Optional[str] = Field(
        default=None, description="URL to the generated PDF report"
    )
    generated_at: datetime


class ReportGenerateRequest(BaseModel):
    """Request body for triggering report generation."""

    model_config = ConfigDict(from_attributes=True)

    report_type: str = Field(
        pattern="^(weekly|monthly)$",
        description="Must be 'weekly' or 'monthly'",
    )
    month: Optional[int] = Field(default=None, ge=1, le=12)
    year: Optional[int] = Field(default=None, ge=2020)
