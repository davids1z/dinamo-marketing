"""Audit log model for tracking admin/user actions."""

import uuid

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )  # e.g. "user.login", "membership.role_change", "client.update"
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "user", "client", "membership", "project"
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
