"""Studio router — file upload, AI scene generation, rendering, publishing."""

import asyncio
import logging
import uuid as uuid_mod
from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_studio_service

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for async generation tasks
_studio_tasks: dict[str, dict] = {}

# Max upload size: 100MB
MAX_UPLOAD_SIZE = 100 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    # Images
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    # Videos
    "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
    # Audio
    "audio/mpeg", "audio/wav", "audio/ogg",
}


# ------------------------------------------------------------------
# File Upload
# ------------------------------------------------------------------

@router.post("/upload")
async def upload_media(
    post_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a media file (image, video, audio) for a post."""
    # Validate MIME type
    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Nepodržani tip datoteke: {mime}. Dozvoljeni: slike, videi, audio.",
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Datoteka prevelika. Maksimalna veličina: {MAX_UPLOAD_SIZE // (1024*1024)}MB",
        )

    service = get_studio_service()
    asset = await service.save_upload(
        db=db,
        post_id=post_id,
        file_content=content,
        original_filename=file.filename or "upload",
        mime_type=mime,
    )

    return {
        "id": str(asset.id),
        "filename": asset.filename,
        "original_filename": asset.original_filename,
        "mime_type": asset.mime_type,
        "file_size": asset.file_size,
        "url": asset.url,
        "asset_type": asset.asset_type,
        "created_at": asset.created_at.isoformat(),
    }


@router.get("/uploads/{post_id}")
async def list_uploads(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all uploaded media for a post."""
    service = get_studio_service()
    assets = await service.list_uploads(db, post_id)
    return [
        {
            "id": str(a.id),
            "filename": a.filename,
            "original_filename": a.original_filename,
            "mime_type": a.mime_type,
            "file_size": a.file_size,
            "url": a.url,
            "asset_type": a.asset_type,
            "created_at": a.created_at.isoformat(),
        }
        for a in assets
    ]


@router.delete("/uploads/{asset_id}")
async def delete_upload(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an uploaded media file."""
    service = get_studio_service()
    deleted = await service.delete_upload(db, asset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Datoteka nije pronađena")
    return {"deleted": True}


# ------------------------------------------------------------------
# Projects
# ------------------------------------------------------------------

@router.get("/projects/{post_id}")
async def get_project(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get or create a studio project for a post."""
    service = get_studio_service()
    try:
        project = await service.get_or_create_project(db, post_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return _serialize_project(project)


@router.patch("/projects/{post_id}")
async def update_project(
    post_id: UUID,
    updates: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """Update a studio project (brief, scene_data, captions, etc.)."""
    service = get_studio_service()
    try:
        project = await service.update_project(db, post_id, updates)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return _serialize_project(project)


# ------------------------------------------------------------------
# AI Scene Generation (async polling pattern)
# ------------------------------------------------------------------

async def _run_scene_generation(
    task_id: str, post_id: UUID, brief: str
):
    """Background coroutine for AI scene generation."""
    from app.database import async_session_factory

    try:
        async with async_session_factory() as db:
            service = get_studio_service()
            scene_data = await service.generate_scenes(db, post_id, brief)
            _studio_tasks[task_id] = {
                "status": "done",
                "scene_data": scene_data,
                "post_id": str(post_id),
            }
    except Exception as e:
        logger.error("Studio AI generation failed for post %s: %s", post_id, e)
        _studio_tasks[task_id] = {
            "status": "error",
            "error": str(e),
            "post_id": str(post_id),
        }


@router.post("/projects/{post_id}/generate")
async def generate_scenes(
    post_id: UUID,
    brief: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    """Start async AI scene generation. Returns task_id to poll."""
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY nije konfiguriran",
        )

    # Verify post exists
    from app.models.content import ContentPost
    from sqlalchemy import select

    query = select(ContentPost).where(ContentPost.id == post_id)
    result = await db.execute(query)
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post nije pronađen")

    task_id = str(uuid_mod.uuid4())
    _studio_tasks[task_id] = {"status": "running", "post_id": str(post_id)}

    asyncio.create_task(_run_scene_generation(task_id, post_id, brief))

    return {"task_id": task_id, "status": "running"}


@router.get("/projects/task/{task_id}")
async def get_generation_result(task_id: str):
    """Poll for AI scene generation result."""
    task = _studio_tasks.get(task_id)
    if not task:
        return {"status": "not_found", "error": "Zadatak nije pronađen"}
    return task


# ------------------------------------------------------------------
# Rendering & Export
# ------------------------------------------------------------------

@router.post("/projects/{post_id}/render-video")
async def render_video(
    post_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Accept WebM upload, convert to MP4 via FFmpeg."""
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Video prevelik. Maksimalno {MAX_UPLOAD_SIZE // (1024*1024)}MB",
        )

    service = get_studio_service()
    try:
        output_url = await service.render_video(db, post_id, content)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"output_url": output_url, "post_id": str(post_id)}


@router.post("/projects/{post_id}/export-image")
async def export_image(
    post_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Save an exported PNG from the client-side canvas."""
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20MB max for images
        raise HTTPException(status_code=400, detail="Slika prevelika. Maksimalno 20MB")

    service = get_studio_service()
    output_url = await service.save_export(
        db, post_id, content, filename=file.filename or "export.png"
    )

    return {"output_url": output_url, "post_id": str(post_id)}


# ------------------------------------------------------------------
# Publish
# ------------------------------------------------------------------

@router.post("/projects/{post_id}/publish")
async def publish_project(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Publish the studio project output to the target platform."""
    service = get_studio_service()
    try:
        result = await service.publish(db, post_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _serialize_project(project) -> dict:
    """Serialize a StudioProject to a dict."""
    return {
        "id": str(project.id),
        "post_id": str(project.post_id),
        "brief": project.brief,
        "scene_data": project.scene_data,
        "generated_caption": project.generated_caption,
        "generated_hashtags": project.generated_hashtags,
        "generated_description": project.generated_description,
        "output_url": project.output_url,
        "output_type": project.output_type,
        "status": project.status,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }
