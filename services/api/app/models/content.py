"""Modul 5-7: Content Engine, Templates, Approval Queue models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ContentPlan(BaseModel):
    __tablename__ = "content_plans"

    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    market_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft"
    )  # draft, approved, active, completed
    total_posts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    approved_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ai"
    )  # ai, manual
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True
    )

    posts: Mapped[list["ContentPost"]] = relationship(back_populates="plan")


class ContentPost(BaseModel):
    __tablename__ = "content_posts"
    __table_args__ = (
        Index("ix_content_posts_status", "status"),
        Index("ix_content_posts_platform", "platform"),
        Index("ix_content_posts_scheduled_at", "scheduled_at"),
    )

    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_plans.id"), nullable=True
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_templates.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    content_pillar: Mapped[str] = mapped_column(
        String(50), nullable=False, default=""
    )  # match_highlights, behind_scenes, academy, etc.
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft"
    )  # draft, pending_review, approved, scheduled, published, failed, archived
    caption_hr: Mapped[str] = mapped_column(Text, nullable=False, default="")
    caption_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    caption_de: Mapped[str] = mapped_column(Text, nullable=False, default="")
    hashtags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cta_text: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    visual_brief: Mapped[str] = mapped_column(Text, nullable=False, default="")
    visual_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    is_champions_league: Mapped[bool] = mapped_column(Boolean, default=False)
    is_academy: Mapped[bool] = mapped_column(Boolean, default=False)

    # Publish tracking
    platform_post_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    platform_post_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    publish_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    publish_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True
    )

    plan: Mapped["ContentPlan | None"] = relationship(back_populates="posts")
    template: Mapped["ContentTemplate | None"] = relationship()
    approval_actions: Mapped[list["ApprovalAction"]] = relationship(back_populates="post")
    metrics: Mapped[list["PostMetric"]] = relationship(
        "PostMetric", back_populates="post", foreign_keys="[PostMetric.post_id]"
    )
    studio_project: Mapped["StudioProject | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "StudioProject", back_populates="post", uselist=False
    )


class ContentTemplate(BaseModel):
    __tablename__ = "content_templates"

    category: Mapped[str] = mapped_column(String(50), nullable=False)
    subcategory: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    platform: Mapped[str] = mapped_column(
        String(20), nullable=False, default="all"
    )  # all, instagram, tiktok, etc.
    format_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # image, video, carousel, story, reel
    structure: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    preview_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )


class ApprovalAction(BaseModel):
    __tablename__ = "approval_actions"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_posts.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # approve, reject, edit
    user_id: Mapped[str] = mapped_column(String(100), nullable=False, default="system")
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    original_caption: Mapped[str] = mapped_column(Text, nullable=False, default="")
    edited_caption: Mapped[str] = mapped_column(Text, nullable=False, default="")
    acted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )

    post: Mapped["ContentPost"] = relationship(back_populates="approval_actions")
