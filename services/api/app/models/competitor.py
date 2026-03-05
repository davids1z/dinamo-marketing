"""Modul 3: Competitor Intelligence Hub models."""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Competitor(BaseModel):
    __tablename__ = "competitors"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    league: Mapped[str] = mapped_column(String(200), nullable=False)
    website: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    logo_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")

    metrics: Mapped[list["CompetitorMetric"]] = relationship(back_populates="competitor")
    alerts: Mapped[list["CompetitorAlert"]] = relationship(back_populates="competitor")


class CompetitorMetric(BaseModel):
    __tablename__ = "competitor_metrics"

    competitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    content_formats: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    target_markets: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    language_strategy: Mapped[str] = mapped_column(String(200), nullable=False, default="")

    competitor: Mapped["Competitor"] = relationship(back_populates="metrics")


class CompetitorAlert(BaseModel):
    __tablename__ = "competitor_alerts"

    competitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False
    )
    alert_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # engagement_spike, viral_post, campaign_launch
    description: Mapped[str] = mapped_column(Text, nullable=False)
    post_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    engagement_spike: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    competitor: Mapped["Competitor"] = relationship(back_populates="alerts")
