from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client, get_buffer_client
from app.services.diaspora_manager import DiasporaManagerService

router = APIRouter()


def _get_service():
    return DiasporaManagerService(
        get_claude_client(),
        get_buffer_client(),
    )


@router.get("/map")
async def get_diaspora_map(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_diaspora_map(db)
    return result


@router.get("/events")
async def get_community_events(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_community_events(db)
    return result


@router.post("/adapt/{post_id}")
async def adapt_content_for_market(
    post_id: UUID,
    target_lang: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.adapt_content_for_market(db, post_id, target_lang)
    return result


@router.get("/populations")
async def get_populations(db: AsyncSession = Depends(get_db)):
    from app.models import DiasporaPopulation

    query = select(DiasporaPopulation).order_by(DiasporaPopulation.created_at.desc())
    res = await db.execute(query)
    populations = res.scalars().all()
    return populations
