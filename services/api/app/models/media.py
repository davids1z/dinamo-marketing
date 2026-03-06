"""Content Studio models: MediaAsset for uploads, StudioProject for scene data."""

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class MediaAsset(BaseModel):
    __tablename__ = "media_assets"

    post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_posts.id"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    asset_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # image, video, audio
    thumbnail_url: Mapped[str] = mapped_column(String(1000), nullable=False, default="")


class StudioProject(BaseModel):
    __tablename__ = "studio_projects"

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_posts.id"), nullable=False, unique=True
    )
    brief: Mapped[str] = mapped_column(Text, nullable=False, default="")
    scene_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    generated_caption: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_hashtags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    generated_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    output_url: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    output_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=""
    )  # image, video
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft"
    )  # draft, generating, generated, rendering, rendered, published

    post: Mapped["ContentPost"] = relationship(back_populates="studio_project")  # type: ignore[name-defined]  # noqa: F821
