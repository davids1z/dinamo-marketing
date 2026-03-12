"""Modul 16: Report Generator models."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class WeeklyReport(BaseModel):
    __tablename__ = "weekly_reports"

    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    week_end: Mapped[date] = mapped_column(Date, nullable=False)
    data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    top_posts: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    top_ads: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True
    )


class MonthlyReport(BaseModel):
    __tablename__ = "monthly_reports"

    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    competitor_comparison: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_strategy: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pdf_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True
    )
