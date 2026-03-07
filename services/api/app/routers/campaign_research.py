import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.campaign_research import CampaignResearch, CampaignResearchStatus

router = APIRouter()


def _extract_text_from_file(content: bytes, filename: str) -> str:
    """Extract text from uploaded file."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        try:
            import io

            import pdfplumber

            text_parts = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            return "\n\n".join(text_parts)
        except ImportError:
            # Fallback: try to decode as text
            try:
                return content.decode("utf-8", errors="ignore")
            except Exception:
                return ""
        except Exception:
            return ""

    elif ext == "docx":
        try:
            import io

            import docx

            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError:
            try:
                return content.decode("utf-8", errors="ignore")
            except Exception:
                return ""
        except Exception:
            return ""

    else:
        # Plain text, markdown, etc.
        try:
            return content.decode("utf-8", errors="ignore")
        except Exception:
            return ""


@router.post("/upload")
async def upload_campaign_brief(
    file: UploadFile = File(None),
    text: str = Form(None),
    title: str = Form("Nova kampanja"),
    db: AsyncSession = Depends(get_db),
):
    """Upload a campaign brief (PDF, DOCX, or plain text) and start research."""
    from app.tasks.campaign_research import run_campaign_research

    # Extract text from file or use provided text
    extracted_text = ""
    filename = ""

    if file:
        content = await file.read()
        filename = file.filename or "unknown"
        extracted_text = _extract_text_from_file(content, filename)
        if not extracted_text.strip():
            raise HTTPException(
                status_code=400, detail="Nije moguce izvuci tekst iz datoteke."
            )
    elif text:
        extracted_text = text
    else:
        raise HTTPException(status_code=400, detail="Potrebna je datoteka ili tekst.")

    # Create campaign research record
    campaign = CampaignResearch(
        title=title,
        status=CampaignResearchStatus.UPLOADED.value,
        uploaded_filename=filename,
        uploaded_text=extracted_text[:50000],  # Limit text size
    )
    db.add(campaign)
    await db.flush()

    # Start background task
    task = run_campaign_research.delay(str(campaign.id))
    campaign.task_id = task.id
    await db.flush()

    return {
        "id": str(campaign.id),
        "title": campaign.title,
        "status": campaign.status,
        "task_id": task.id,
    }


@router.get("/")
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """List all campaign research records."""
    query = select(CampaignResearch).order_by(CampaignResearch.created_at.desc())
    result = await db.execute(query)
    campaigns = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "title": c.title,
            "campaign_type": c.campaign_type,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in campaigns
    ]


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Get full campaign research details."""
    try:
        uid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign ID")

    result = await db.execute(
        select(CampaignResearch).where(CampaignResearch.id == uid)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Kampanja nije pronadena")

    return {
        "id": str(campaign.id),
        "title": campaign.title,
        "campaign_type": campaign.campaign_type,
        "status": campaign.status,
        "uploaded_filename": campaign.uploaded_filename,
        "extracted_brief": campaign.extracted_brief,
        "research_data": campaign.research_data,
        "generated_plan": campaign.generated_plan,
        "error_message": campaign.error_message,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        "updated_at": campaign.updated_at.isoformat() if campaign.updated_at else None,
    }


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a campaign research record."""
    try:
        uid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign ID")

    result = await db.execute(
        select(CampaignResearch).where(CampaignResearch.id == uid)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Kampanja nije pronadena")

    await db.delete(campaign)
    return {"deleted": True}
