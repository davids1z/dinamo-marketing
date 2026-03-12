"""Modul 4: Fan Data Platform models."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class FanProfile(BaseModel):
    __tablename__ = "fan_profiles"

    external_ids: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    city: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    age_range: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    platforms: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_active: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    lifecycle_stage: Mapped[str] = mapped_column(
        String(30), nullable=False, default="new"
    )  # new, casual, engaged, superfan, ambassador
    clv_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    lifecycle_events: Mapped[list["FanLifecycleEvent"]] = relationship(back_populates="fan")


class FanSegment(BaseModel):
    __tablename__ = "fan_segments"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    criteria: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_clv: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    churn_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    growth_trend: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )  # % change month over month
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )


class FanLifecycleEvent(BaseModel):
    __tablename__ = "fan_lifecycle_events"

    fan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fan_profiles.id"), nullable=False
    )
    from_stage: Mapped[str] = mapped_column(String(30), nullable=False)
    to_stage: Mapped[str] = mapped_column(String(30), nullable=False)
    trigger: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # e.g., "ticket_purchase", "engagement_increase"
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    fan: Mapped["FanProfile"] = relationship(back_populates="lifecycle_events")
