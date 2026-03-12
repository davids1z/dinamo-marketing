"""Add projects table and project_id to per-project tables.

Revision ID: f7c3e5d86a03
Revises: e6b2d4f75c92
Create Date: 2026-03-12 18:00:00.000000
"""

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "f7c3e5d86a03"
down_revision = "e6b2d4f75c92"
branch_labels = None
depends_on = None

# Tables that need project_id (per-project data)
PER_PROJECT_TABLES = [
    "campaigns",
    "content_plans",
    "content_posts",
    "campaign_research",
    "weekly_reports",
    "monthly_reports",
    "polls",
    "ugc_submissions",
    "fan_spotlights",
    "optimization_rules",
    "predictions",
    "studio_projects",
]


def upgrade() -> None:
    # ──────────────────────────────────────────────────────
    # 1. Create projects table
    # ──────────────────────────────────────────────────────
    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column(
            "client_id",
            UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("client_id", "slug", name="uq_project_client_slug"),
    )
    op.create_index("ix_projects_client_id", "projects", ["client_id"])
    op.create_index("ix_projects_slug", "projects", ["slug"])

    # ──────────────────────────────────────────────────────
    # 2. Add onboarding_completed to clients
    # ──────────────────────────────────────────────────────
    op.add_column(
        "clients",
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # ──────────────────────────────────────────────────────
    # 3. Insert default project for every existing client
    # ──────────────────────────────────────────────────────
    conn = op.get_bind()
    clients = conn.execute(sa.text("SELECT id FROM clients")).fetchall()
    now = datetime.now(timezone.utc)

    for (client_id,) in clients:
        project_id = uuid.uuid4()
        conn.execute(
            sa.text(
                "INSERT INTO projects (id, client_id, name, slug, description, is_active, created_at, updated_at) "
                "VALUES (:id, :client_id, :name, :slug, :desc, true, :now, :now)"
            ),
            {
                "id": project_id,
                "client_id": client_id,
                "name": "Default",
                "slug": "default",
                "desc": "Default project",
                "now": now,
            },
        )

    # Mark existing clients as onboarded
    conn.execute(sa.text("UPDATE clients SET onboarding_completed = true"))

    # ──────────────────────────────────────────────────────
    # 4. Add nullable project_id to all per-project tables
    # ──────────────────────────────────────────────────────
    for table in PER_PROJECT_TABLES:
        op.add_column(
            table,
            sa.Column("project_id", UUID(as_uuid=True), nullable=True),
        )

    # ──────────────────────────────────────────────────────
    # 5. Backfill project_id from default project
    # ──────────────────────────────────────────────────────
    for table in PER_PROJECT_TABLES:
        conn.execute(
            sa.text(
                f"UPDATE {table} SET project_id = ("
                f"  SELECT p.id FROM projects p WHERE p.client_id = {table}.client_id LIMIT 1"
                f")"
            )
        )

    # ──────────────────────────────────────────────────────
    # 6. Make project_id NOT NULL + add FK + index
    # ──────────────────────────────────────────────────────
    for table in PER_PROJECT_TABLES:
        op.alter_column(table, "project_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table}_project_id",
            table,
            "projects",
            ["project_id"],
            ["id"],
        )
        op.create_index(f"ix_{table}_project_id", table, ["project_id"])


def downgrade() -> None:
    conn = op.get_bind()

    # Remove project_id from all per-project tables
    for table in reversed(PER_PROJECT_TABLES):
        op.drop_index(f"ix_{table}_project_id", table_name=table)
        op.drop_constraint(f"fk_{table}_project_id", table, type_="foreignkey")
        op.drop_column(table, "project_id")

    # Remove onboarding_completed from clients
    op.drop_column("clients", "onboarding_completed")

    # Drop projects table
    op.drop_index("ix_projects_slug", table_name="projects")
    op.drop_index("ix_projects_client_id", table_name="projects")
    op.drop_table("projects")
