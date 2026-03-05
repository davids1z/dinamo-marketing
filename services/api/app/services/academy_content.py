"""Modul 12: Academy Content Factory service."""

import logging
from datetime import date
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academy import AcademyMatch, AcademyPlayer, AcademyStat

logger = logging.getLogger(__name__)

TEAM_LEVELS = ["U15", "U17", "U19", "first_team"]


class AcademyContentService:
    def __init__(self, claude_client):
        self.claude_client = claude_client

    async def get_players(self, db: AsyncSession) -> list[dict]:
        """Get all academy players grouped by team level."""
        result = await db.execute(
            select(AcademyPlayer).order_by(
                AcademyPlayer.team_level, AcademyPlayer.name
            )
        )
        players = result.scalars().all()

        if not players:
            logger.info("No academy players found; returning empty roster")
            return [
                {
                    "team_level": level,
                    "players": [],
                    "count": 0,
                }
                for level in TEAM_LEVELS
            ]

        # Group by team level
        grouped: dict = {}
        for player in players:
            if player.team_level not in grouped:
                grouped[player.team_level] = []
            grouped[player.team_level].append({
                "id": str(player.id),
                "name": player.name,
                "position": player.position,
                "birth_year": player.birth_year,
                "joined_date": player.joined_date.isoformat(),
                "is_featured": player.is_featured,
                "stats": player.stats or {},
            })

        return [
            {
                "team_level": level,
                "players": grouped.get(level, []),
                "count": len(grouped.get(level, [])),
            }
            for level in TEAM_LEVELS
        ]

    async def get_player_detail(self, db: AsyncSession, player_id: UUID) -> dict:
        """Get detailed profile for a single academy player."""
        player = await db.get(AcademyPlayer, player_id)
        if not player:
            raise ValueError(f"Academy player {player_id} not found")

        # Generate a content-ready bio via Claude
        try:
            bio = await self.claude_client.generate_player_bio({
                "name": player.name,
                "position": player.position,
                "birth_year": player.birth_year,
                "team_level": player.team_level,
                "stats": player.stats or {},
            })
        except Exception as exc:
            logger.error(f"Failed to generate bio for {player.name}: {exc}")
            bio = {
                "bio_hr": f"{player.name} - {player.position}, {player.team_level}",
                "bio_en": f"{player.name} - {player.position}, {player.team_level}",
            }

        # Get matches where this player scored
        matches_result = await db.execute(
            select(AcademyMatch)
            .where(AcademyMatch.team_level == player.team_level)
            .order_by(AcademyMatch.date.desc())
            .limit(10)
        )
        recent_matches = matches_result.scalars().all()

        # Filter matches where player appears in scorers
        player_matches = []
        for match in recent_matches:
            scorers = match.scorers or {}
            if player.name in str(scorers):
                player_matches.append({
                    "match_id": str(match.id),
                    "opponent": match.opponent,
                    "date": match.date.isoformat(),
                    "result": match.result,
                })

        return {
            "id": str(player.id),
            "name": player.name,
            "position": player.position,
            "birth_year": player.birth_year,
            "team_level": player.team_level,
            "joined_date": player.joined_date.isoformat(),
            "is_featured": player.is_featured,
            "stats": player.stats or {},
            "bio": bio,
            "recent_matches": player_matches,
        }

    async def generate_match_report(self, db: AsyncSession, match_id: UUID) -> dict:
        """Generate a social-media-ready match report for an academy match."""
        match = await db.get(AcademyMatch, match_id)
        if not match:
            raise ValueError(f"Academy match {match_id} not found")

        # Get all players for this team level
        players_result = await db.execute(
            select(AcademyPlayer)
            .where(AcademyPlayer.team_level == match.team_level)
        )
        roster = players_result.scalars().all()

        # Generate match report via Claude
        try:
            report = await self.claude_client.generate_academy_match_report({
                "team_level": match.team_level,
                "opponent": match.opponent,
                "date": match.date.isoformat(),
                "result": match.result,
                "scorers": match.scorers or {},
                "highlights": match.highlights or {},
                "roster": [
                    {"name": p.name, "position": p.position}
                    for p in roster
                ],
            })
        except Exception as exc:
            logger.error(f"Match report generation failed: {exc}")
            report = {
                "headline_hr": f"Dinamo {match.team_level}: {match.result} vs {match.opponent}",
                "headline_en": f"Dinamo {match.team_level}: {match.result} vs {match.opponent}",
                "summary_hr": "",
                "summary_en": "",
                "social_posts": [],
            }

        logger.info(f"Generated match report for {match.team_level} vs {match.opponent}")

        return {
            "match_id": str(match.id),
            "team_level": match.team_level,
            "opponent": match.opponent,
            "date": match.date.isoformat(),
            "result": match.result,
            "scorers": match.scorers or {},
            "report": report,
        }

    async def get_academy_stats(self, db: AsyncSession) -> dict:
        """Get aggregate academy statistics for content creation."""
        # Get latest stat period
        result = await db.execute(
            select(AcademyStat).order_by(AcademyStat.period.desc()).limit(1)
        )
        latest_stat = result.scalar_one_or_none()

        # Player counts by level
        counts_result = await db.execute(
            select(
                AcademyPlayer.team_level,
                func.count(AcademyPlayer.id).label("count"),
            )
            .group_by(AcademyPlayer.team_level)
        )
        level_counts = {row.team_level: row.count for row in counts_result}

        # Recent match results
        matches_result = await db.execute(
            select(AcademyMatch)
            .order_by(AcademyMatch.date.desc())
            .limit(20)
        )
        recent_matches = matches_result.scalars().all()

        # Calculate win/draw/loss record
        wins = draws = losses = 0
        for match in recent_matches:
            if match.result:
                parts = match.result.split("-")
                if len(parts) == 2:
                    try:
                        home, away = int(parts[0].strip()), int(parts[1].strip())
                        if home > away:
                            wins += 1
                        elif home == away:
                            draws += 1
                        else:
                            losses += 1
                    except ValueError:
                        pass

        # Featured players
        featured_result = await db.execute(
            select(AcademyPlayer)
            .where(AcademyPlayer.is_featured == True)
        )
        featured_players = featured_result.scalars().all()

        return {
            "period": latest_stat.period if latest_stat else "N/A",
            "players_by_level": level_counts,
            "total_players": sum(level_counts.values()),
            "players_promoted": latest_stat.players_promoted if latest_stat else 0,
            "players_sold": latest_stat.players_sold if latest_stat else 0,
            "transfer_revenue": latest_stat.transfer_revenue if latest_stat else 0.0,
            "active_camps": latest_stat.active_camps if latest_stat else {},
            "recent_record": {
                "matches": len(recent_matches),
                "wins": wins,
                "draws": draws,
                "losses": losses,
            },
            "featured_players": [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "position": p.position,
                    "team_level": p.team_level,
                }
                for p in featured_players
            ],
        }
