"""Add swot_analysis JSON column to competitors table.

Revision ID: i0f6h8g19d36
Revises: h9e5g7f08c25
Create Date: 2026-03-16 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers
revision = "i0f6h8g19d36"
down_revision = "h9e5g7f08c25"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "competitors",
        sa.Column("swot_analysis", JSON, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("competitors", "swot_analysis")
