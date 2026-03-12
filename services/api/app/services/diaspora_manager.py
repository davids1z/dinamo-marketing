"""Modul 13: Diaspora Market Manager service."""

import logging
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import ContentPost
from app.models.market import Country, DiasporaData

logger = logging.getLogger(__name__)

# Supported localization languages
SUPPORTED_LANGUAGES = ["hr", "en", "de", "at", "es", "fr", "it", "sv"]

# Major diaspora markets
PRIORITY_MARKETS = [
    {"country": "Germany", "code": "DE"},
    {"country": "Austria", "code": "AT"},
    {"country": "Australia", "code": "AU"},
    {"country": "United States", "code": "US"},
    {"country": "Canada", "code": "CA"},
    {"country": "Sweden", "code": "SE"},
    {"country": "Switzerland", "code": "CH"},
    {"country": "Argentina", "code": "AR"},
]


class DiasporaManagerService:
    def __init__(self, claude_client, buffer_client):
        self.claude_client = claude_client
        self.buffer_client = buffer_client

    async def get_diaspora_map(self, db: AsyncSession) -> dict:
        """Get Croatian diaspora populations by country and city concentrations."""
        result = await db.execute(
            select(DiasporaData, Country)
            .join(Country, DiasporaData.country_id == Country.id)
            .order_by(DiasporaData.croatian_population.desc())
        )
        rows = result.all()

        if not rows:
            logger.info("No diaspora data found; returning default map")
            return {
                "total_diaspora": 0,
                "countries": [
                    {
                        "country": m["country"],
                        "code": m["code"],
                        "population": 0,
                        "cities": {},
                    }
                    for m in PRIORITY_MARKETS
                ],
                "data_source": "default",
            }

        total_population = 0
        countries = []
        all_cities: dict = {}

        for diaspora, country in rows:
            total_population += diaspora.croatian_population
            city_data = diaspora.city_concentrations or {}

            countries.append({
                "country": country.name,
                "code": country.code,
                "region_type": country.region_type,
                "population": diaspora.croatian_population,
                "cities": city_data,
                "source": diaspora.source,
                "data_year": diaspora.year,
            })

            # Aggregate city-level data
            for city, pop in city_data.items():
                if city not in all_cities:
                    all_cities[city] = {"population": 0, "country": country.name}
                all_cities[city]["population"] += pop if isinstance(pop, int) else 0

        # Top 10 cities by Croatian population
        top_cities = sorted(
            [
                {"city": city, "country": data["country"], "population": data["population"]}
                for city, data in all_cities.items()
            ],
            key=lambda x: x["population"],
            reverse=True,
        )[:10]

        return {
            "total_diaspora": total_population,
            "countries_count": len(countries),
            "countries": countries,
            "top_cities": top_cities,
            "data_source": "database",
        }

    async def get_community_events(self, db: AsyncSession) -> list[dict]:
        """Get diaspora community events and watch parties."""
        # Query content posts tagged for diaspora communities
        result = await db.execute(
            select(ContentPost)
            .where(
                ContentPost.content_pillar == "fan_engagement",
                ContentPost.status.in_(["approved", "scheduled", "published"]),
            )
            .order_by(ContentPost.scheduled_at.desc())
            .limit(30)
        )
        posts = result.scalars().all()

        events = []
        for post in posts:
            # Check if post has diaspora-relevant hashtags
            hashtags = post.hashtags or {}
            hashtag_list = hashtags if isinstance(hashtags, list) else list(hashtags.keys())
            is_diaspora = any(
                tag.lower() in ["#brandworld", "#branddijaspora", "#brandaroundtheworld"]
                for tag in hashtag_list
            )

            if is_diaspora or "diaspora" in (post.caption_en or "").lower():
                events.append({
                    "id": str(post.id),
                    "title": (post.caption_en or post.caption_hr or "")[:100],
                    "platform": post.platform,
                    "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
                    "status": post.status,
                    "is_champions_league": post.is_champions_league,
                })

        if not events:
            return [
                {
                    "id": None,
                    "title": "No diaspora events currently scheduled",
                    "platform": "all",
                    "scheduled_at": None,
                    "status": "none",
                    "is_champions_league": False,
                }
            ]

        return events

    async def adapt_content_for_market(
        self, db: AsyncSession, post_id: UUID, target_lang: str
    ) -> dict:
        """Adapt a content post for a specific diaspora market/language."""
        post = await db.get(ContentPost, post_id)
        if not post:
            raise ValueError(f"Content post {post_id} not found")

        if target_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Language '{target_lang}' not supported. "
                f"Supported: {', '.join(SUPPORTED_LANGUAGES)}"
            )

        # Use Claude to adapt content for the target market
        source_text = post.caption_hr or post.caption_en or ""
        try:
            adapted = await self.claude_client.adapt_content_for_market({
                "source_text": source_text,
                "source_lang": "hr",
                "target_lang": target_lang,
                "platform": post.platform,
                "content_pillar": post.content_pillar,
                "is_champions_league": post.is_champions_league,
                "hashtags": post.hashtags,
                "cta_text": post.cta_text,
            })
        except Exception as exc:
            logger.error(f"Content adaptation failed for post {post_id}: {exc}")
            adapted = {
                "adapted_caption": source_text,
                "adapted_hashtags": post.hashtags,
                "adapted_cta": post.cta_text,
                "cultural_notes": [],
            }

        # Schedule the adapted post via Buffer
        try:
            schedule_result = await self.buffer_client.schedule_post({
                "text": adapted.get("adapted_caption", ""),
                "platform": post.platform,
                "hashtags": adapted.get("adapted_hashtags", []),
                "media_url": post.visual_url,
                "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
            })
            scheduled = True
            buffer_id = schedule_result.get("id")
        except Exception as exc:
            logger.error(f"Buffer scheduling failed: {exc}")
            scheduled = False
            buffer_id = None

        logger.info(
            f"Adapted post {post_id} for {target_lang}, scheduled={scheduled}"
        )

        return {
            "original_post_id": str(post_id),
            "target_language": target_lang,
            "adapted_caption": adapted.get("adapted_caption", ""),
            "adapted_hashtags": adapted.get("adapted_hashtags", []),
            "adapted_cta": adapted.get("adapted_cta", ""),
            "cultural_notes": adapted.get("cultural_notes", []),
            "scheduled": scheduled,
            "buffer_id": buffer_id,
        }
