"""Modul 9: Real-Time Optimization Engine models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class OptimizationRule(BaseModel):
    __tablename__ = "optimization_rules"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    condition: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    action_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # pause, scale, refresh, reallocate, alert
    action_params: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class OptimizationLog(BaseModel):
    __tablename__ = "optimization_logs"

    rule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("optimization_rules.id"), nullable=True
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True
    )
    ad_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ads.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    old_value: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    new_value: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
