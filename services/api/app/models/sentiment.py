"""Modul 10-11: Sentiment Analysis & Social Listening models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class SentimentRecord(BaseModel):
    __tablename__ = "sentiment_records"

    source_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # post_comment, mention, ugc
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="hr")
    sentiment: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # positive, neutral, negative
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    topics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SentimentAlert(BaseModel):
    __tablename__ = "sentiment_alerts"

    alert_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # spike_negative, crisis, trend_shift
    severity: Mapped[str] = mapped_column(
        String(10), nullable=False, default="medium"
    )  # low, medium, high, critical
    description: Mapped[str] = mapped_column(Text, nullable=False)
    related_post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)


class BrandMention(BaseModel):
    __tablename__ = "brand_mentions"

    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    author: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    sentiment: Mapped[str] = mapped_column(String(10), nullable=False, default="neutral")
    reach_estimate: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_influencer: Mapped[bool] = mapped_column(Boolean, default=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TrendingTopic(BaseModel):
    __tablename__ = "trending_topics"

    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    volume: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    growth_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    related_keywords: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    first_detected: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
