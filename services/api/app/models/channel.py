"""Modul 2: Channel Audit Engine models."""

import uuid
from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class SocialChannel(BaseModel):
    __tablename__ = "social_channels"

    owner_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # own, competitor
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    platform: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # instagram, facebook, tiktok, youtube, web
    handle: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    is_primary: Mapped[bool] = mapped_column(default=True)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    metrics: Mapped[list["ChannelMetric"]] = relationship(back_populates="channel")
    health_scores: Mapped[list["ChannelHealthScore"]] = relationship(back_populates="channel")


class ChannelMetric(BaseModel):
    __tablename__ = "channel_metrics"
    __table_args__ = (
        Index("ix_channel_metrics_channel_date", "channel_id", "date"),
    )

    channel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("social_channels.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_reach: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    posting_frequency: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )  # posts per week
    demographics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    top_posts: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    format_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    channel: Mapped["SocialChannel"] = relationship(back_populates="metrics")


class ChannelHealthScore(BaseModel):
    __tablename__ = "channel_health_scores"

    channel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("social_channels.id"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    growth_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    engagement_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    content_quality_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    audience_quality_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    channel: Mapped["SocialChannel"] = relationship(back_populates="health_scores")
