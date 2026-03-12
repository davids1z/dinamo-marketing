"""Multi-tenant client model and user-client junction."""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Client(BaseModel):
    __tablename__ = "clients"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Brand profile (for AI context)
    business_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    product_info: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tone_of_voice: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    target_audience: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Visual identity
    brand_colors: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    brand_fonts: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    website_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")

    # AI & content
    languages: Mapped[list | None] = mapped_column(JSON, nullable=True)
    content_pillars: Mapped[list | None] = mapped_column(JSON, nullable=True)
    social_handles: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    hashtags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_system_prompt_override: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Onboarding
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    members: Mapped[list["UserClient"]] = relationship(
        "UserClient", back_populates="client", cascade="all, delete-orphan"
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="client", cascade="all, delete-orphan"
    )


class UserClient(BaseModel):
    __tablename__ = "user_clients"
    __table_args__ = (
        UniqueConstraint("user_id", "client_id", name="uq_user_client"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="viewer"
    )  # viewer, moderator, admin

    # Relationships
    user = relationship("User", back_populates="client_memberships")
    client: Mapped["Client"] = relationship("Client", back_populates="members")
