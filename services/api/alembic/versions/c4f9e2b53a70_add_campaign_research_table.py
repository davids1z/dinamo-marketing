"""add campaign_research table

Revision ID: c4f9e2b53a70
Revises: b3e7d1a42f59
Create Date: 2026-03-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = "c4f9e2b53a70"
down_revision = "b3e7d1a42f59"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "campaign_research",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False, server_default="Nova kampanja"),
        sa.Column("campaign_type", sa.String(100), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="uploaded"),
        sa.Column("uploaded_filename", sa.String(500), nullable=True),
        sa.Column("uploaded_text", sa.Text, nullable=True),
        sa.Column("extracted_brief", JSON, nullable=True),
        sa.Column("research_data", JSON, nullable=True),
        sa.Column("generated_plan", JSON, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("task_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("campaign_research")
