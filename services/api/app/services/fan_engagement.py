"""Modul 17: Fan Engagement Tools service."""

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.engagement import FanSpotlight, Poll, PollVote, UGCSubmission

logger = logging.getLogger(__name__)


class FanEngagementService:
    def __init__(self, claude_client):
        self.claude_client = claude_client

    async def create_poll(self, db: AsyncSession, data: dict) -> dict:
        """Create a new fan poll."""
        poll = Poll(
            question=data["question"],
            options=data.get("options", ["Da", "Ne"]),
            platform=data.get("platform", "all"),
            status="draft",
            starts_at=data.get("starts_at"),
            ends_at=data.get("ends_at"),
            total_votes=0,
        )
        db.add(poll)
        await db.flush()

        logger.info(f"Created poll '{data['question'][:50]}' with {len(poll.options or [])} options")

        return {
            "poll_id": str(poll.id),
            "question": poll.question,
            "options": poll.options,
            "platform": poll.platform,
            "status": poll.status,
            "starts_at": poll.starts_at.isoformat() if poll.starts_at else None,
            "ends_at": poll.ends_at.isoformat() if poll.ends_at else None,
        }

    async def vote_poll(
        self, db: AsyncSession, poll_id: UUID, option_index: int, fan_id: UUID
    ) -> dict:
        """Cast a vote on a poll."""
        poll = await db.get(Poll, poll_id)
        if not poll:
            raise ValueError(f"Poll {poll_id} not found")

        if poll.status != "active":
            raise ValueError(f"Poll is not active (status: {poll.status})")

        options = poll.options or []
        if option_index < 0 or option_index >= len(options):
            raise ValueError(
                f"Invalid option index {option_index}. "
                f"Poll has {len(options)} options (0-{len(options) - 1})"
            )

        # Check for duplicate vote
        existing_vote = await db.execute(
            select(PollVote).where(
                PollVote.poll_id == poll_id,
                PollVote.fan_id == fan_id,
            )
        )
        if existing_vote.scalar_one_or_none():
            raise ValueError(f"Fan {fan_id} has already voted on this poll")

        # Record vote
        vote = PollVote(
            poll_id=poll_id,
            option_index=option_index,
            fan_id=fan_id,
        )
        db.add(vote)

        # Update total votes
        poll.total_votes = (poll.total_votes or 0) + 1
        await db.flush()

        # Get vote distribution
        distribution_result = await db.execute(
            select(
                PollVote.option_index,
                func.count(PollVote.id).label("count"),
            )
            .where(PollVote.poll_id == poll_id)
            .group_by(PollVote.option_index)
        )
        distribution = {row.option_index: row.count for row in distribution_result}

        total = sum(distribution.values())
        results = []
        for idx, option_text in enumerate(options):
            count = distribution.get(idx, 0)
            results.append({
                "option_index": idx,
                "option_text": option_text,
                "votes": count,
                "percentage": round((count / max(total, 1)) * 100, 1),
            })

        return {
            "poll_id": str(poll_id),
            "vote_recorded": True,
            "option_voted": option_index,
            "option_text": options[option_index],
            "total_votes": total,
            "results": results,
        }

    async def get_polls(self, db: AsyncSession) -> list[dict]:
        """Get all polls with their current results."""
        result = await db.execute(
            select(Poll).order_by(Poll.created_at.desc())
        )
        polls = result.scalars().all()

        if not polls:
            return []

        poll_list = []
        for poll in polls:
            # Get vote distribution for each poll
            dist_result = await db.execute(
                select(
                    PollVote.option_index,
                    func.count(PollVote.id).label("count"),
                )
                .where(PollVote.poll_id == poll.id)
                .group_by(PollVote.option_index)
            )
            distribution = {row.option_index: row.count for row in dist_result}

            options = poll.options or []
            total = sum(distribution.values())
            results = []
            for idx, option_text in enumerate(options):
                count = distribution.get(idx, 0)
                results.append({
                    "option_index": idx,
                    "option_text": option_text,
                    "votes": count,
                    "percentage": round((count / max(total, 1)) * 100, 1),
                })

            poll_list.append({
                "id": str(poll.id),
                "question": poll.question,
                "options": options,
                "platform": poll.platform,
                "status": poll.status,
                "total_votes": poll.total_votes or 0,
                "results": results,
                "starts_at": poll.starts_at.isoformat() if poll.starts_at else None,
                "ends_at": poll.ends_at.isoformat() if poll.ends_at else None,
            })

        return poll_list

    async def submit_ugc(self, db: AsyncSession, data: dict) -> dict:
        """Submit user-generated content for review."""
        submission = UGCSubmission(
            campaign_hashtag=data.get("campaign_hashtag", "#DinamoFans"),
            platform=data.get("platform", "instagram"),
            author=data.get("author", ""),
            content_url=data["content_url"],
            thumbnail_url=data.get("thumbnail_url", ""),
            sentiment="neutral",
            is_featured=False,
        )
        db.add(submission)
        await db.flush()

        # Analyze sentiment of the UGC via Claude
        try:
            analysis = await self.claude_client.analyze_sentiment(
                [data.get("caption", data.get("content_url", ""))]
            )
            if analysis:
                submission.sentiment = analysis[0].get("sentiment", "neutral")
                await db.flush()
        except Exception as exc:
            logger.error(f"UGC sentiment analysis failed: {exc}")

        logger.info(
            f"UGC submitted by {submission.author} on {submission.platform}"
        )

        return {
            "submission_id": str(submission.id),
            "campaign_hashtag": submission.campaign_hashtag,
            "platform": submission.platform,
            "author": submission.author,
            "content_url": submission.content_url,
            "sentiment": submission.sentiment,
            "is_featured": submission.is_featured,
            "status": "submitted",
        }

    async def get_fan_leaderboard(self, db: AsyncSession) -> list[dict]:
        """Get fan engagement leaderboard based on votes, UGC submissions, and spotlights."""
        # Count poll votes per fan
        votes_result = await db.execute(
            select(
                PollVote.fan_id,
                func.count(PollVote.id).label("vote_count"),
            )
            .where(PollVote.fan_id.isnot(None))
            .group_by(PollVote.fan_id)
        )
        vote_scores = {row.fan_id: row.vote_count for row in votes_result}

        # Count UGC submissions per author
        ugc_result = await db.execute(
            select(
                UGCSubmission.author,
                func.count(UGCSubmission.id).label("ugc_count"),
            )
            .group_by(UGCSubmission.author)
        )
        ugc_scores = {row.author: row.ugc_count for row in ugc_result}

        # Count spotlights per fan
        spotlight_result = await db.execute(
            select(
                FanSpotlight.fan_id,
                func.count(FanSpotlight.id).label("spotlight_count"),
            )
            .where(FanSpotlight.fan_id.isnot(None))
            .group_by(FanSpotlight.fan_id)
        )
        spotlight_scores = {row.fan_id: row.spotlight_count for row in spotlight_result}

        # Combine scores (votes=1pt, UGC=3pts, spotlight=5pts)
        all_fan_ids = set(vote_scores.keys()) | set(spotlight_scores.keys())
        leaderboard_data = []

        for fan_id in all_fan_ids:
            votes = vote_scores.get(fan_id, 0)
            spotlights = spotlight_scores.get(fan_id, 0)
            total_points = (votes * 1) + (spotlights * 5)

            leaderboard_data.append({
                "fan_id": str(fan_id),
                "votes": votes,
                "spotlights": spotlights,
                "total_points": total_points,
            })

        # Add UGC-only contributors (keyed by author string, not fan_id)
        for author, ugc_count in ugc_scores.items():
            if author:
                leaderboard_data.append({
                    "fan_id": None,
                    "author": author,
                    "ugc_submissions": ugc_count,
                    "total_points": ugc_count * 3,
                })

        # Sort by total points
        leaderboard_data.sort(key=lambda x: x["total_points"], reverse=True)

        # Add ranks
        for idx, entry in enumerate(leaderboard_data[:50]):
            entry["rank"] = idx + 1

        if not leaderboard_data:
            return [
                {
                    "rank": 1,
                    "message": "No fan engagement data yet",
                    "total_points": 0,
                }
            ]

        logger.info(f"Generated leaderboard with {len(leaderboard_data[:50])} entries")
        return leaderboard_data[:50]
