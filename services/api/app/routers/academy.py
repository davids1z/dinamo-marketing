from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client
from app.services.academy_content import AcademyContentService

router = APIRouter()


def _get_service():
    return AcademyContentService(get_claude_client())


@router.get("/players")
async def get_players(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_players(db)
    return result


@router.get("/players/{player_id}")
async def get_player_detail(player_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_player_detail(db, player_id)
    return result


@router.post("/match-report/{match_id}")
async def generate_match_report(match_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.generate_match_report(db, match_id)
    return result


@router.get("/stats")
async def get_academy_stats(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_academy_stats(db)
    return result


@router.get("/matches")
async def list_matches(db: AsyncSession = Depends(get_db)):
    from app.models import Match

    query = select(Match).order_by(Match.created_at.desc())
    res = await db.execute(query)
    matches = res.scalars().all()
    return matches
