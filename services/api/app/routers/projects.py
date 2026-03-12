"""Project CRUD router — manages projects within a client."""

import logging
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client, require_admin_role
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """List all active projects for the current client."""
    user, client, role = ctx
    result = await db.execute(
        select(Project)
        .where(Project.client_id == client.id, Project.is_active == True)
        .order_by(Project.name)
    )
    return [
        ProjectResponse(
            id=str(p.id),
            client_id=str(p.client_id),
            name=p.name,
            slug=p.slug,
            description=p.description,
            is_active=p.is_active,
        )
        for p in result.scalars().all()
    ]


@router.post("/", status_code=201, response_model=ProjectResponse)
async def create_project(
    body: ProjectCreate,
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project. Client admin or superadmin only."""
    user, client, role = ctx

    # Check slug uniqueness within client
    existing = await db.execute(
        select(Project).where(
            Project.client_id == client.id,
            Project.slug == body.slug,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug već postoji za ovog klijenta")

    project = Project(
        client_id=client.id,
        name=body.name,
        slug=body.slug,
        description=body.description,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    logger.info("Project created: %s/%s by %s", client.slug, project.slug, user.email)
    return ProjectResponse(
        id=str(project.id),
        client_id=str(project.client_id),
        name=project.name,
        slug=project.slug,
        description=project.description,
        is_active=project.is_active,
    )


@router.put("/{project_id}", response_model=dict)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """Update a project. Client admin or superadmin only."""
    user, client, role = ctx

    result = await db.execute(
        select(Project).where(
            Project.id == _uuid.UUID(project_id),
            Project.client_id == client.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nije pronađen")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    await db.commit()
    logger.info("Project updated: %s/%s by %s", client.slug, project.slug, user.email)
    return {"status": "updated"}
