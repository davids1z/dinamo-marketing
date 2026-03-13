"""Add audit_logs table and subscription fields to clients.

Revision ID: h9e5g7f08c25
Revises: g8d4f6e97b14
Create Date: 2026-03-13 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

# revision identifiers
revision = "h9e5g7f08c25"
down_revision = "g8d4f6e97b14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- audit_logs table ---
    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=True),
        sa.Column("details", JSON, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- subscription fields on clients ---
    op.add_column("clients", sa.Column("plan", sa.String(20), nullable=False, server_default="free"))
    op.add_column("clients", sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("clients", sa.Column("ai_credits_total", sa.Integer(), nullable=False, server_default="1000"))
    op.add_column("clients", sa.Column("ai_credits_used", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("clients", "ai_credits_used")
    op.drop_column("clients", "ai_credits_total")
    op.drop_column("clients", "plan_expires_at")
    op.drop_column("clients", "plan")
    op.drop_table("audit_logs")
