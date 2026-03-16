"""Add composite DB indexes for analytics queries.

Revision ID: k2h8j0i31f58
Revises: j1g7i9h20e47
Create Date: 2026-03-16 15:00:00.000000
"""

from alembic import op

# revision identifiers
revision = "k2h8j0i31f58"
down_revision = "j1g7i9h20e47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Composite index on post_metrics (client_id, timestamp)
    op.create_index(
        "ix_post_metrics_client_timestamp",
        "post_metrics",
        ["client_id", "timestamp"],
    )
    # Composite index on ad_metrics (client_id, timestamp)
    op.create_index(
        "ix_ad_metrics_client_timestamp",
        "ad_metrics",
        ["client_id", "timestamp"],
    )
    # Composite index on channel_metrics (channel_id, date)
    op.create_index(
        "ix_channel_metrics_channel_date",
        "channel_metrics",
        ["channel_id", "date"],
    )


def downgrade() -> None:
    op.drop_index("ix_channel_metrics_channel_date", table_name="channel_metrics")
    op.drop_index("ix_ad_metrics_client_timestamp", table_name="ad_metrics")
    op.drop_index("ix_post_metrics_client_timestamp", table_name="post_metrics")
