from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_client, get_claude_client
from app.services.academy_content import AcademyContentService
from app.models.academy import AcademyPlayer, AcademyMatch

router = APIRouter()


def _get_service():
    return AcademyContentService(get_claude_client())


@router.get("/players")
async def get_players(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns {metrics, players, contentPipeline} for the Academy page."""
    user, client, role = ctx
    service = _get_service()

    # Get stats for metrics
    stats = await service.get_academy_stats(db)

    # Get all players as flat list
    result = await db.execute(
        select(AcademyPlayer).where(AcademyPlayer.client_id == client.id).order_by(AcademyPlayer.name)
    )
    players_db = result.scalars().all()

    # Map to frontend PlayerRow shape
    players = []
    for i, p in enumerate(players_db, 1):
        player_stats = p.stats or {}
        team_level = p.team_level or ""
        age_group = team_level if team_level.startswith("U") else "U21"
        if team_level == "first_team":
            age_group = "U21"

        players.append({
            "id": i,
            "name": p.name,
            "position": p.position or "CM",
            "ageGroup": age_group,
            "appearances": player_stats.get("appearances", 0),
            "goals": player_stats.get("goals", 0),
            "assists": player_stats.get("assists", 0),
            "featured": p.is_featured,
            "socialMentions": player_stats.get("social_mentions", 0),
        })

    # Build metrics from stats
    active_camps = stats.get("active_camps", {})
    active_camps_count = len(active_camps) if isinstance(active_camps, dict) else (active_camps if isinstance(active_camps, int) else 0)

    metrics = {
        "promotedPlayers": stats.get("players_promoted", 0),
        "prevPromotedPlayers": max(stats.get("players_promoted", 0) - 3, 0),
        "transferRevenue": stats.get("transfer_revenue", 0),
        "prevTransferRevenue": max(int(stats.get("transfer_revenue", 0) * 0.7), 0),
        "activeCamps": active_camps_count,
    }

    content_pipeline = [
        {"id": 1, "title": "U19 finale highlights reel", "type": "Video", "platform": "Instagram + TikTok", "status": "U produkciji", "due": "Mar 7"},
        {"id": 2, "title": "Od akademije do prvog tima", "type": "Dokumentarac", "platform": "YouTube", "status": "Pregled scenarija", "due": "Mar 12"},
        {"id": 3, "title": "Promocija upisa na kamp akademije", "type": "Karusel", "platform": "Instagram + Facebook", "status": "Spremno", "due": "Mar 6"},
        {"id": 4, "title": "Omladinski kup iza kulisa", "type": "Serija prica", "platform": "Instagram", "status": "Snimanje", "due": "Mar 9"},
        {"id": 5, "title": "Mjesecni bilten akademije", "type": "Email + Web", "platform": "Web stranica", "status": "Nacrt", "due": "Mar 15"},
    ]

    return {
        "metrics": metrics,
        "players": players,
        "contentPipeline": content_pipeline,
    }


@router.get("/players/{player_id}")
async def get_player_detail(
    player_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_player_detail(db, player_id)
    return result


@router.post("/match-report/{match_id}")
async def generate_match_report(
    match_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.generate_match_report(db, match_id)
    return result


@router.get("/stats")
async def get_academy_stats(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_academy_stats(db)
    return result


@router.get("/matches")
async def list_matches(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    query = select(AcademyMatch).where(AcademyMatch.client_id == client.id).order_by(AcademyMatch.created_at.desc())
    res = await db.execute(query)
    matches = res.scalars().all()
    return matches
