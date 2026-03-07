"""add platform_settings table

Revision ID: d5a1f3c64b81
Revises: c4f9e2b53a70
Create Date: 2026-03-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "d5a1f3c64b81"
down_revision = "c4f9e2b53a70"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_settings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(255), nullable=False, unique=True),
        sa.Column("value", sa.Text, nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="general"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_platform_settings_key", "platform_settings", ["key"])


def downgrade() -> None:
    op.drop_index("ix_platform_settings_key")
    op.drop_table("platform_settings")
