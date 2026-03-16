"""Partner & Creator model — tracks brand partnerships and influencer collaborations."""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Partner(BaseModel):
    __tablename__ = "partners"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Identity
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    handle: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    platform: Mapped[str] = mapped_column(String(30), nullable=False, default="instagram")  # instagram, tiktok, youtube, multi
    website: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")

    # Classification
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="")  # lifestyle, sports, tech, etc.
    partner_type: Mapped[str] = mapped_column(String(30), nullable=False, default="influencer")  # influencer, brand, media, agency
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="prospect")  # prospect, active, paused, ended

    # Metrics
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_reach_per_post: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    audience_overlap_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # 0-100

    # AI match scoring fields (heuristic)
    match_score: Mapped[int] = mapped_column(Integer, nullable=False, default=50)  # 0-100

    # Partnership details
    partnership_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    partnership_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    campaign_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_posts_delivered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_reach_delivered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_cpe: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # cost per engagement

    # AI context
    audience_demographics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    top_content_topics: Mapped[list | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    client: Mapped["Client"] = relationship("Client")  # type: ignore[name-defined]
