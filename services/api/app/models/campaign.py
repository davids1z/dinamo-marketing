"""Modul 8: Campaign Manager & A/B Testing models."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Campaign(BaseModel):
    __tablename__ = "campaigns"

    name: Mapped[str] = mapped_column(String(300), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)  # meta, tiktok
    market_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=True
    )
    objective: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # awareness, traffic, conversions
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft"
    )  # draft, active, paused, completed
    daily_budget: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    max_budget: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_spend: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    ad_sets: Mapped[list["AdSet"]] = relationship(back_populates="campaign")
    ab_tests: Mapped[list["ABTest"]] = relationship(back_populates="campaign")


class AdSet(BaseModel):
    __tablename__ = "ad_sets"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    targeting: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    placement: Mapped[str] = mapped_column(String(50), nullable=False, default="automatic")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    budget: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    audience_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    campaign: Mapped["Campaign"] = relationship(back_populates="ad_sets")
    ads: Mapped[list["Ad"]] = relationship(back_populates="ad_set")


class Ad(BaseModel):
    __tablename__ = "ads"

    ad_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ad_sets.id"), nullable=False
    )
    variant_label: Mapped[str] = mapped_column(
        String(5), nullable=False
    )  # A, B, C
    headline: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cta: Mapped[str] = mapped_column(String(50), nullable=False, default="Learn More")
    image_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    video_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # active, paused, winner, loser

    ad_set: Mapped["AdSet"] = relationship(back_populates="ads")
    metrics: Mapped[list["AdMetric"]] = relationship(
        "AdMetric", back_populates="ad", foreign_keys="AdMetric.ad_id"
    )


class ABTest(BaseModel):
    __tablename__ = "ab_tests"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="running"
    )  # running, decided, inconclusive
    winner_ad_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ads.id"), nullable=True
    )
    confidence_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")

    campaign: Mapped["Campaign"] = relationship(back_populates="ab_tests")
