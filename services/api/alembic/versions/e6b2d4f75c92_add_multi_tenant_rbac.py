"""Add multi-tenant RBAC: clients, user_clients, client_id on all data tables.

Revision ID: e6b2d4f75c92
Revises: d5a1f3c64b81
Create Date: 2026-03-12 16:00:00.000000
"""

import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers
revision = "e6b2d4f75c92"
down_revision = "d5a1f3c64b81"
branch_labels = None
depends_on = None

# All data tables that need client_id (everything except users, clients, user_clients, platform_settings)
DATA_TABLES = [
    "social_channels",
    "channel_metrics",
    "channel_health_scores",
    "competitors",
    "competitor_metrics",
    "competitor_alerts",
    "fan_profiles",
    "fan_segments",
    "fan_lifecycle_events",
    "content_plans",
    "content_posts",
    "content_templates",
    "approval_actions",
    "campaigns",
    "ad_sets",
    "ads",
    "ab_tests",
    "post_metrics",
    "ad_metrics",
    "attribution_events",
    "sentiment_records",
    "sentiment_alerts",
    "brand_mentions",
    "trending_topics",
    "polls",
    "poll_votes",
    "predictions",
    "ugc_submissions",
    "fan_spotlights",
    "academy_players",
    "academy_matches",
    "academy_stats",
    "optimization_rules",
    "optimization_logs",
    "weekly_reports",
    "monthly_reports",
    "notifications",
    "media_assets",
    "studio_projects",
    "campaign_research",
    "countries",
    "sports_events",
    "market_audiences",
    "diaspora_data",
    "search_trends",
    "market_scores",
]


def upgrade() -> None:
    # 1. Create clients table
    op.create_table(
        "clients",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("business_description", sa.Text(), server_default="", nullable=False),
        sa.Column("product_info", sa.Text(), server_default="", nullable=False),
        sa.Column("tone_of_voice", sa.String(500), server_default="", nullable=False),
        sa.Column("target_audience", sa.Text(), server_default="", nullable=False),
        sa.Column("brand_colors", JSON(), nullable=True),
        sa.Column("brand_fonts", JSON(), nullable=True),
        sa.Column("logo_url", sa.String(500), server_default="", nullable=False),
        sa.Column("website_url", sa.String(500), server_default="", nullable=False),
        sa.Column("languages", JSON(), nullable=True),
        sa.Column("content_pillars", JSON(), nullable=True),
        sa.Column("social_handles", JSON(), nullable=True),
        sa.Column("hashtags", JSON(), nullable=True),
        sa.Column("ai_system_prompt_override", sa.Text(), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 2. Create user_clients junction table
    op.create_table(
        "user_clients",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), server_default="viewer", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "client_id", name="uq_user_client"),
    )

    # 3. Add is_superadmin to users table
    op.add_column("users", sa.Column("is_superadmin", sa.Boolean(), server_default="false", nullable=False))

    # 4. Insert default "Demo Brand" client
    default_client_id = str(uuid.uuid4())
    op.execute(
        f"""
        INSERT INTO clients (id, name, slug, is_active, business_description, product_info,
                            tone_of_voice, target_audience, brand_colors, languages,
                            content_pillars, hashtags, created_at, updated_at)
        VALUES (
            '{default_client_id}',
            'Demo Brand',
            'demo-brand',
            true,
            'A modern digital marketing brand focused on innovative content creation and audience engagement.',
            'Digital marketing services including social media management, content creation, and campaign optimization.',
            'Professional, modern, approachable',
            'Marketing professionals aged 25-45, digital-native businesses, growing brands',
            '{{"primary": "#0A1A28", "accent": "#B8FF00", "blue": "#0057A8"}}',
            '["hr", "en", "de"]',
            '[{{"id": "product", "name": "Proizvod/usluga"}}, {{"id": "engagement", "name": "Engagement"}}, {{"id": "education", "name": "Edukacija"}}, {{"id": "behind_scenes", "name": "Iza kulisa"}}]',
            '["#DemoBrand", "#ShiftOneZero"]',
            now(),
            now()
        )
        """
    )

    # 5. Add client_id column (nullable first) to all data tables
    for table in DATA_TABLES:
        op.add_column(table, sa.Column("client_id", UUID(as_uuid=True), nullable=True))

    # 6. Backfill all existing rows with the default client ID
    for table in DATA_TABLES:
        op.execute(f"UPDATE {table} SET client_id = '{default_client_id}'")

    # 7. Make client_id NOT NULL
    for table in DATA_TABLES:
        op.alter_column(table, "client_id", nullable=False)

    # 8. Add FK constraints
    for table in DATA_TABLES:
        op.create_foreign_key(
            f"fk_{table}_client_id",
            table,
            "clients",
            ["client_id"],
            ["id"],
        )

    # 9. Add indexes on client_id for all data tables
    for table in DATA_TABLES:
        op.create_index(f"ix_{table}_client_id", table, ["client_id"])

    # 10. Migrate existing users to user_clients junction
    # admin users → admin role on Demo Brand + superadmin flag
    # editor users → moderator role
    # viewer users → viewer role
    op.execute(
        f"""
        INSERT INTO user_clients (id, user_id, client_id, role, created_at, updated_at)
        SELECT gen_random_uuid(), id, '{default_client_id}',
               CASE WHEN role = 'admin' THEN 'admin'
                    WHEN role = 'editor' THEN 'moderator'
                    ELSE 'viewer' END,
               now(), now()
        FROM users
        """
    )
    op.execute("UPDATE users SET is_superadmin = true WHERE role = 'admin'")


def downgrade() -> None:
    # Remove is_superadmin from users
    op.drop_column("users", "is_superadmin")

    # Remove client_id from all data tables
    for table in reversed(DATA_TABLES):
        op.drop_index(f"ix_{table}_client_id", table_name=table)
        op.drop_constraint(f"fk_{table}_client_id", table, type_="foreignkey")
        op.drop_column(table, "client_id")

    # Drop junction and clients tables
    op.drop_table("user_clients")
    op.drop_table("clients")
