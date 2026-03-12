import enum
import uuid

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class CampaignResearchStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    ANALYZING = "analyzing"
    RESEARCHING = "researching"
    GENERATING = "generating"
    COMPLETE = "complete"
    FAILED = "failed"


class CampaignResearch(BaseModel):
    __tablename__ = "campaign_research"

    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Nova kampanja")
    campaign_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default=CampaignResearchStatus.UPLOADED.value
    )

    # Upload
    uploaded_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploaded_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Phase 1: Brief extraction
    extracted_brief: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Phase 2: Web research
    research_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Phase 3: Generated plan
    generated_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Error tracking
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Celery task ID for polling
    task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True
    )
