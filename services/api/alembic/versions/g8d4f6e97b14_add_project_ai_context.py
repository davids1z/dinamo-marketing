"""Add ai_context column to projects table.

Revision ID: g8d4f6e97b14
Revises: f7c3e5d86a03
Create Date: 2026-03-12 22:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "g8d4f6e97b14"
down_revision = "f7c3e5d86a03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("ai_context", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("projects", "ai_context")
