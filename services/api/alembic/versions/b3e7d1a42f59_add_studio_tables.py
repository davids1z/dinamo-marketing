"""add studio tables

Revision ID: b3e7d1a42f59
Revises: a2f8c3d91e47
Create Date: 2026-03-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = "b3e7d1a42f59"
down_revision = "a2f8c3d91e47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "media_assets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("content_posts.id"), nullable=True),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("duration_seconds", sa.Float, nullable=True),
        sa.Column("storage_path", sa.String(1000), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("asset_type", sa.String(20), nullable=False),
        sa.Column("thumbnail_url", sa.String(1000), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "studio_projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("post_id", UUID(as_uuid=True), sa.ForeignKey("content_posts.id"), nullable=False, unique=True),
        sa.Column("brief", sa.Text, nullable=False, server_default=""),
        sa.Column("scene_data", JSON, nullable=True),
        sa.Column("generated_caption", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_hashtags", JSON, nullable=True),
        sa.Column("generated_description", sa.Text, nullable=False, server_default=""),
        sa.Column("output_url", sa.String(1000), nullable=False, server_default=""),
        sa.Column("output_type", sa.String(20), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("studio_projects")
    op.drop_table("media_assets")
