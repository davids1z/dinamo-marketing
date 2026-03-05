"""Modul 14: Champions League Surge Mode service."""

import logging
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.models.content import ContentPost

logger = logging.getLogger(__name__)

# Surge mode activation window: days before CL match
SURGE_WINDOW_DAYS = 3
# Post-match content window
POST_MATCH_WINDOW_HOURS = 48

# Content templates for CL surge
CL_CONTENT_PILLARS = [
    "pre_match_hype",
    "matchday_countdown",
    "lineup_reveal",
    "live_reactions",
    "post_match_highlights",
    "player_spotlight",
    "fan_reactions",
    "tactical_analysis",
]

# Default budget multiplier for CL campaigns
DEFAULT_CL_MULTIPLIER = 3.0


class CLSurgeService:
    def __init__(self, claude_client, meta_client):
        self.claude_client = claude_client
        self.meta_client = meta_client

    async def check_surge_status(self, db: AsyncSession) -> dict:
        """Check if Champions League surge mode should be active."""
        today = date.today()
        surge_window_start = today
        surge_window_end = today + timedelta(days=SURGE_WINDOW_DAYS)

        # Look for CL-tagged content in the upcoming window
        result = await db.execute(
            select(ContentPost)
            .where(
                ContentPost.is_champions_league == True,
                ContentPost.scheduled_at >= datetime.combine(surge_window_start, datetime.min.time()),
                ContentPost.scheduled_at <= datetime.combine(surge_window_end, datetime.max.time()),
            )
            .order_by(ContentPost.scheduled_at)
        )
        upcoming_cl_posts = result.scalars().all()

        # Check for active CL campaigns
        campaigns_result = await db.execute(
            select(Campaign)
            .where(
                Campaign.status == "active",
                Campaign.name.ilike("%champions%league%"),
            )
        )
        active_cl_campaigns = campaigns_result.scalars().all()

        is_surge_active = len(upcoming_cl_posts) > 0 or len(active_cl_campaigns) > 0

        # Calculate surge intensity
        if is_surge_active:
            # Higher intensity closer to match day
            if upcoming_cl_posts:
                earliest = upcoming_cl_posts[0].scheduled_at
                days_until = (earliest.date() - today).days if earliest else SURGE_WINDOW_DAYS
                intensity = max(1.0, DEFAULT_CL_MULTIPLIER - (days_until * 0.5))
            else:
                intensity = DEFAULT_CL_MULTIPLIER
        else:
            intensity = 1.0

        return {
            "surge_active": is_surge_active,
            "intensity": round(intensity, 1),
            "upcoming_cl_posts": len(upcoming_cl_posts),
            "active_cl_campaigns": len(active_cl_campaigns),
            "window": {
                "start": surge_window_start.isoformat(),
                "end": surge_window_end.isoformat(),
            },
            "next_cl_post": (
                upcoming_cl_posts[0].scheduled_at.isoformat()
                if upcoming_cl_posts
                else None
            ),
            "checked_at": datetime.utcnow().isoformat(),
        }

    async def activate_surge(
        self, db: AsyncSession, match_date: date, opponent: str
    ) -> dict:
        """Activate CL surge mode for a specific match."""
        surge_start = match_date - timedelta(days=SURGE_WINDOW_DAYS)
        surge_end = match_date + timedelta(hours=POST_MATCH_WINDOW_HOURS)

        # Generate surge content plan via Claude
        try:
            surge_plan = await self.claude_client.generate_cl_surge_plan({
                "match_date": match_date.isoformat(),
                "opponent": opponent,
                "surge_start": surge_start.isoformat(),
                "content_pillars": CL_CONTENT_PILLARS,
            })
        except Exception as exc:
            logger.error(f"CL surge plan generation failed: {exc}")
            surge_plan = {"posts": []}

        # Create content posts from surge plan
        created_posts = []
        for post_data in surge_plan.get("posts", []):
            post = ContentPost(
                platform=post_data.get("platform", "instagram"),
                content_pillar=post_data.get("pillar", "pre_match_hype"),
                scheduled_at=post_data.get("scheduled_at"),
                status="pending_review",
                caption_hr=post_data.get("caption_hr", ""),
                caption_en=post_data.get("caption_en", ""),
                caption_de=post_data.get("caption_de", ""),
                hashtags=post_data.get("hashtags"),
                cta_text=post_data.get("cta", ""),
                visual_brief=post_data.get("visual_brief", ""),
                is_champions_league=True,
            )
            db.add(post)
            created_posts.append(post)

        await db.flush()

        logger.info(
            f"CL Surge activated for {opponent} on {match_date}: "
            f"{len(created_posts)} posts created"
        )

        return {
            "status": "activated",
            "match_date": match_date.isoformat(),
            "opponent": opponent,
            "surge_window": {
                "start": surge_start.isoformat(),
                "end": surge_end.isoformat() if isinstance(surge_end, date) else str(surge_end),
            },
            "posts_created": len(created_posts),
            "post_ids": [str(p.id) for p in created_posts],
            "content_pillars": CL_CONTENT_PILLARS,
        }

    async def generate_pre_match_content(
        self, db: AsyncSession, opponent: str
    ) -> list[dict]:
        """Generate pre-match content across all platforms for a CL match."""
        platforms = ["instagram", "facebook", "tiktok", "youtube", "twitter"]

        try:
            content_batch = await self.claude_client.generate_pre_match_content({
                "opponent": opponent,
                "platforms": platforms,
                "languages": ["hr", "en", "de"],
                "content_types": [
                    "countdown_graphic",
                    "history_vs_opponent",
                    "player_spotlight",
                    "fan_call_to_action",
                    "tactical_preview",
                ],
            })
        except Exception as exc:
            logger.error(f"Pre-match content generation failed: {exc}")
            content_batch = []

        created = []
        for item in content_batch:
            post = ContentPost(
                platform=item.get("platform", "instagram"),
                content_pillar="pre_match_hype",
                status="pending_review",
                caption_hr=item.get("caption_hr", ""),
                caption_en=item.get("caption_en", ""),
                caption_de=item.get("caption_de", ""),
                hashtags=item.get("hashtags"),
                cta_text=item.get("cta", ""),
                visual_brief=item.get("visual_brief", ""),
                is_champions_league=True,
            )
            db.add(post)
            created.append({
                "platform": post.platform,
                "content_type": item.get("content_type", ""),
                "caption_hr": post.caption_hr[:100],
                "caption_en": post.caption_en[:100],
                "visual_brief": post.visual_brief[:100],
                "status": "pending_review",
            })

        await db.flush()
        logger.info(f"Generated {len(created)} pre-match content pieces for {opponent}")
        return created

    async def boost_ad_budget(
        self, db: AsyncSession, campaign_id: UUID, multiplier: float
    ) -> dict:
        """Boost an existing campaign's budget for CL surge mode."""
        campaign = await db.get(Campaign, campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        original_daily = campaign.daily_budget
        original_max = campaign.max_budget
        new_daily = original_daily * multiplier
        new_max = original_max * multiplier

        campaign.daily_budget = new_daily
        campaign.max_budget = new_max

        # Apply budget change on Meta if applicable
        if campaign.platform == "meta":
            try:
                await self.meta_client.update_campaign_budget(
                    str(campaign_id),
                    daily_budget=new_daily,
                )
            except Exception as exc:
                logger.error(f"Meta budget update failed: {exc}")

        await db.flush()

        logger.info(
            f"Boosted campaign '{campaign.name}' budget: "
            f"EUR {original_daily:.0f} -> EUR {new_daily:.0f}/day ({multiplier}x)"
        )

        return {
            "campaign_id": str(campaign_id),
            "campaign_name": campaign.name,
            "multiplier": multiplier,
            "original_daily_budget": original_daily,
            "new_daily_budget": new_daily,
            "original_max_budget": original_max,
            "new_max_budget": new_max,
            "platform": campaign.platform,
            "status": campaign.status,
        }
