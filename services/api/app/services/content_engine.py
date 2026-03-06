"""Modul 5: AI Content Engine service."""

import logging
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import ApprovalAction, ContentPlan, ContentPost, ContentTemplate

logger = logging.getLogger(__name__)

PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "twitter"]
CONTENT_PILLARS = [
    "match_highlights",
    "player_interviews",
    "behind_scenes",
    "academy",
    "tactical",
    "fan_engagement",
    "lifestyle",
]


class ContentEngineService:
    def __init__(self, claude_client, image_client):
        self.claude_client = claude_client
        self.image_client = image_client

    async def generate_monthly_plan(
        self, db: AsyncSession, month: int, year: int, context: dict
    ) -> dict:
        """Generate a 30-day content plan using Claude AI."""
        # Generate plan via Claude
        plan_data = await self.claude_client.generate_content_plan({
            "month": month,
            "year": year,
            "matchdays": context.get("matchdays", []),
            "transfer_window": context.get("transfer_window", False),
            "previous_results": context.get("previous_results", []),
            "priority_markets": context.get("priority_markets", []),
            "top_formats": context.get("top_formats", []),
        })

        # Create plan
        plan = ContentPlan(
            month=month,
            year=year,
            status="draft",
            total_posts=len(plan_data.get("posts", [])),
            created_by="ai",
        )
        db.add(plan)
        await db.flush()

        # Create posts from AI plan
        posts = []
        for post_data in plan_data.get("posts", []):
            post = ContentPost(
                plan_id=plan.id,
                platform=post_data.get("platform", "instagram"),
                content_pillar=post_data.get("pillar", "match_highlights"),
                scheduled_at=post_data.get("scheduled_at"),
                status="pending_review",
                caption_hr=post_data.get("caption_hr", ""),
                caption_en=post_data.get("caption_en", ""),
                caption_de=post_data.get("caption_de", ""),
                hashtags=post_data.get("hashtags"),
                cta_text=post_data.get("cta", ""),
                visual_brief=post_data.get("visual_brief", ""),
                is_champions_league=post_data.get("is_cl", False),
                is_academy=post_data.get("is_academy", False),
            )
            db.add(post)
            posts.append(post)

        await db.flush()

        # Auto-translate captions: HR → EN, DE
        translated = 0
        for post in posts:
            if post.caption_hr and (not post.caption_en or not post.caption_de):
                try:
                    target = []
                    if not post.caption_en:
                        target.append("en")
                    if not post.caption_de:
                        target.append("de")
                    translations = await self.claude_client.translate_content(
                        post.caption_hr, "hr", target
                    )
                    if not post.caption_en and "en" in translations:
                        post.caption_en = translations["en"]
                    if not post.caption_de and "de" in translations:
                        post.caption_de = translations["de"]
                    translated += 1
                except Exception as exc:
                    logger.warning("Translation failed for post %s: %s", post.id, exc)

        if translated:
            await db.flush()
            logger.info("Auto-translated %d posts (HR → EN, DE)", translated)

        logger.info(f"Generated plan with {len(posts)} posts for {month}/{year}")

        return {
            "plan_id": str(plan.id),
            "month": month,
            "year": year,
            "total_posts": len(posts),
            "status": "draft",
        }

    async def approve_post(self, db: AsyncSession, post_id: UUID, user_id: str = "marketer") -> dict:
        """Approve a post for publishing."""
        post = await db.get(ContentPost, post_id)
        if not post:
            raise ValueError(f"Post {post_id} not found")

        post.status = "approved"

        action = ApprovalAction(
            post_id=post_id,
            action="approve",
            user_id=user_id,
            original_caption=post.caption_hr,
        )
        db.add(action)
        await db.flush()

        # Update plan counters
        if post.plan_id:
            plan = await db.get(ContentPlan, post.plan_id)
            if plan:
                plan.approved_count += 1

        return {"post_id": str(post_id), "status": "approved"}

    async def reject_post(
        self, db: AsyncSession, post_id: UUID, reason: str = "", user_id: str = "marketer"
    ) -> dict:
        """Reject a post."""
        post = await db.get(ContentPost, post_id)
        if not post:
            raise ValueError(f"Post {post_id} not found")

        post.status = "draft"

        action = ApprovalAction(
            post_id=post_id,
            action="reject",
            user_id=user_id,
            comment=reason,
            original_caption=post.caption_hr,
        )
        db.add(action)
        await db.flush()

        return {"post_id": str(post_id), "status": "draft", "reason": reason}

    async def get_approval_queue(self, db: AsyncSession) -> list[dict]:
        """Get all posts pending review."""
        result = await db.execute(
            select(ContentPost)
            .where(ContentPost.status == "pending_review")
            .order_by(ContentPost.scheduled_at)
        )
        posts = result.scalars().all()
        return [
            {
                "id": str(p.id),
                "platform": p.platform,
                "pillar": p.content_pillar,
                "caption_hr": p.caption_hr,
                "caption_en": p.caption_en,
                "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
                "is_cl": p.is_champions_league,
                "is_academy": p.is_academy,
            }
            for p in posts
        ]

    async def get_calendar(self, db: AsyncSession, month: int, year: int) -> list[dict]:
        """Get content calendar for a month."""
        result = await db.execute(
            select(ContentPost)
            .join(ContentPlan, ContentPost.plan_id == ContentPlan.id)
            .where(ContentPlan.month == month, ContentPlan.year == year)
            .order_by(ContentPost.scheduled_at)
        )
        posts = result.scalars().all()
        return [
            {
                "id": str(p.id),
                "platform": p.platform,
                "pillar": p.content_pillar,
                "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
                "status": p.status,
                "caption_hr": p.caption_hr[:100],
                "is_cl": p.is_champions_league,
            }
            for p in posts
        ]
