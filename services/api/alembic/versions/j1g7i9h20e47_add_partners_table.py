"""Add partners table for partner & creator tracking.

Revision ID: j1g7i9h20e47
Revises: i0f6h8g19d36
Create Date: 2026-03-16 14:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

# revision identifiers
revision = "j1g7i9h20e47"
down_revision = "i0f6h8g19d36"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "partners",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("handle", sa.String(100), nullable=False, server_default=""),
        sa.Column("platform", sa.String(30), nullable=False, server_default="instagram"),
        sa.Column("website", sa.String(500), nullable=False, server_default=""),
        sa.Column("avatar_url", sa.String(500), nullable=False, server_default=""),
        sa.Column("category", sa.String(100), nullable=False, server_default=""),
        sa.Column("partner_type", sa.String(30), nullable=False, server_default="influencer"),
        sa.Column("status", sa.String(20), nullable=False, server_default="prospect"),
        sa.Column("followers", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("engagement_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("avg_reach_per_post", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("audience_overlap_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("match_score", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("partnership_start", sa.Date(), nullable=True),
        sa.Column("partnership_end", sa.Date(), nullable=True),
        sa.Column("campaign_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_posts_delivered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_reach_delivered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_cpe", sa.Float(), nullable=False, server_default="0"),
        sa.Column("audience_demographics", JSON, nullable=True),
        sa.Column("top_content_topics", JSON, nullable=True),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partners_client_id", "partners", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_partners_client_id", table_name="partners")
    op.drop_table("partners")
