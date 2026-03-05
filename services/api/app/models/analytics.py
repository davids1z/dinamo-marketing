"""Modul 15: Analytics Dashboard models."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PostMetric(BaseModel):
    __tablename__ = "post_metrics"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_posts.id"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reach: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    likes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    shares: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    saves: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    new_followers_attributed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    post = relationship(
        "ContentPost", back_populates="metrics", foreign_keys=[post_id]
    )


class AdMetric(BaseModel):
    __tablename__ = "ad_metrics"

    ad_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ads.id"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reach: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ctr: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cpc: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cpm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    spend: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    conversions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    conversion_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    roas: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    frequency: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    video_views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    video_completion_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    ad = relationship("Ad", back_populates="metrics", foreign_keys=[ad_id])


class AttributionEvent(BaseModel):
    __tablename__ = "attribution_events"

    fan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fan_profiles.id"), nullable=True
    )
    channel_sequence: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # ["tiktok", "instagram", "web"]
    first_touch_channel: Mapped[str] = mapped_column(String(30), nullable=False)
    last_touch_channel: Mapped[str] = mapped_column(String(30), nullable=False)
    conversion_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # ticket_purchase, merch_purchase, registration
    conversion_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
