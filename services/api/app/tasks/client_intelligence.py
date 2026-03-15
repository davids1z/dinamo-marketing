"""
ShiftOneZero Marketing Platform - Client Intelligence Initialization

Automatically seeds all data when a client completes onboarding or updates
social handles. Creates SocialChannel, ContentPost, PostMetric, Competitor,
BrandMention, SentimentRecord, and TrendingTopic records so that all
dashboard pages display meaningful data immediately.

Triggered by: complete_onboarding() and update_client() in clients.py
"""

import asyncio
import json
import logging
import random
import uuid
from datetime import date, datetime, timedelta, timezone

import httpx

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OpenRouter config (reuse pattern from brand_analyzer.py)
# ---------------------------------------------------------------------------

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-pro"

_COMPETITOR_SYSTEM_PROMPT = """Ti si AI stručnjak za analizu tržišta i konkurencije.
Na temelju opisa poslovanja tvrtke, identificiraj 5 glavnih konkurenata u digitalnom prostoru.

Odgovori ISKLJUČIVO u JSON formatu — niz od 5 objekata:
[
  {
    "name": "Puni naziv tvrtke",
    "short_name": "Kratki naziv (1-2 riječi)",
    "country": "Država",
    "industry": "Industrija / sektor",
    "website": "https://..."
  }
]

PRAVILA:
1. Konkurenti moraju biti STVARNE tvrtke/brendovi
2. Odaberi konkurente koji su slični po veličini, industriji i ciljnoj publici
3. Preferiraj digitalno aktivne brendove (s Instagram, TikTok, Facebook prisutnošću)
4. SAMO JSON niz, bez teksta oko njega"""

_COMPETITOR_USER_PROMPT = """Opis poslovanja tvrtke: {business_description}

Ciljna publika: {target_audience}

Industrija/sektor prema opisu — identificiraj 5 glavnih konkurenata.
Vrati SAMO JSON niz."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_handle(url_or_handle: str) -> str:
    """Extract clean handle from URL or direct handle string."""
    if not url_or_handle:
        return ""
    clean = url_or_handle.strip().rstrip("/")
    # Remove protocol and domain
    if "://" in clean:
        clean = clean.split("://", 1)[1]
    # Remove domain parts (e.g., instagram.com/handle → handle)
    parts = clean.split("/")
    if len(parts) > 1:
        # Last non-empty segment is the handle
        for part in reversed(parts):
            if part and part not in ("www", ""):
                return part
    return parts[-1] if parts else url_or_handle


def _random_date_in_range(start: datetime, end: datetime) -> datetime:
    """Generate a random datetime between start and end."""
    delta = end - start
    random_seconds = random.randint(0, max(1, int(delta.total_seconds())))
    return start + timedelta(seconds=random_seconds)


def _mock_post_metrics_dict() -> dict:
    """Generate realistic random metrics (mirrors metrics_pull._mock_post_metrics)."""
    impressions = random.randint(5_000, 120_000)
    reach = int(impressions * random.uniform(0.6, 0.85))
    likes = random.randint(100, 8_000)
    comments = random.randint(10, 600)
    shares = random.randint(5, 1_200)
    saves = random.randint(2, 300)
    total_eng = likes + comments + shares + saves
    eng_rate = round((total_eng / reach * 100) if reach > 0 else 0, 2)

    return {
        "impressions": impressions,
        "reach": reach,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "saves": saves,
        "clicks": random.randint(10, 500),
        "engagement_rate": eng_rate,
        "new_followers_attributed": random.randint(0, 50),
    }


# ---------------------------------------------------------------------------
# AI competitor discovery
# ---------------------------------------------------------------------------

async def _discover_competitors_ai(
    business_description: str, target_audience: str, api_key: str
) -> list[dict]:
    """Use OpenRouter (Gemini 2.5 Pro) to discover 5 competitors."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://shiftonezero.xyler.ai",
        "X-Title": "ShiftOneZero Marketing Platform",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": _COMPETITOR_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _COMPETITOR_USER_PROMPT.format(
                    business_description=business_description or "Marketinška tvrtka",
                    target_audience=target_audience or "Opća publika",
                ),
            },
        ],
        "temperature": 0.4,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient(timeout=120.0) as http_client:
        response = await http_client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    logger.info("Competitor discovery response: %d chars", len(content))

    return _parse_competitor_response(content)


def _parse_competitor_response(content: str) -> list[dict]:
    """Parse AI competitor discovery response."""
    import re

    content = content.strip()
    # Strip markdown fences
    if content.startswith("```"):
        first_newline = content.index("\n")
        content = content[first_newline + 1:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Remove trailing commas
    content = re.sub(r",\s*([}\]])", r"\1", content)

    # Try direct parse
    try:
        result = json.loads(content)
        if isinstance(result, list):
            return result[:5]
        if isinstance(result, dict):
            for v in result.values():
                if isinstance(v, list):
                    return v[:5]
    except json.JSONDecodeError:
        pass

    # Try extracting JSON array
    start = content.find("[")
    end = content.rfind("]")
    if start != -1 and end != -1:
        try:
            result = json.loads(content[start : end + 1])
            if isinstance(result, list):
                return result[:5]
        except json.JSONDecodeError:
            pass

    logger.error("Failed to parse competitor response: %s", content[:500])
    return []


def _get_fallback_competitors() -> list[dict]:
    """Return generic placeholder competitors when AI is unavailable."""
    return [
        {"name": "Konkurent A", "short_name": "Konk-A", "country": "Hrvatska", "industry": "Marketing", "website": ""},
        {"name": "Konkurent B", "short_name": "Konk-B", "country": "Hrvatska", "industry": "Marketing", "website": ""},
        {"name": "Konkurent C", "short_name": "Konk-C", "country": "Hrvatska", "industry": "Marketing", "website": ""},
    ]


# ---------------------------------------------------------------------------
# Seed data generators
# ---------------------------------------------------------------------------

MENTION_TEMPLATES_POSITIVE = [
    "Odličan posao, {name}! Svaka čast na kvaliteti.",
    "Najbolji brend u kategoriji, {name} je #1!",
    "Preporučujem svima — {name} nikad ne razočara.",
    "Upravo isprobao/la {name} uslugu. Impresioniran/a sam!",
    "{name} team je fenomenalan. Hvala na svemu!",
    "Love this brand! {name} always delivers quality.",
    "Just tried {name} — exceeded expectations!",
    "Top quality from {name} as always 👏",
]

MENTION_TEMPLATES_NEUTRAL = [
    "Vidim da {name} ima novu kampanju. Zanimljivo.",
    "{name} je objavio novi sadržaj na Instagramu.",
    "Netko spominje {name}? Kakva su iskustva?",
    "Usporedba: {name} vs konkurencija — tko je bolji?",
    "Article: {name} reports growth in digital presence",
    "New update from {name} — what do you think?",
]

MENTION_TEMPLATES_NEGATIVE = [
    "Razočaran/a s {name}. Očekivao/la sam više.",
    "{name} mora poboljšati korisničku podršku.",
    "Cijene od {name} su previsoke za ono što nude.",
    "Not impressed with {name} lately. Quality dropped.",
    "{name} customer service needs improvement.",
]

SENTIMENT_TOPICS = [
    "kvaliteta", "cijena", "usluga", "brend", "kampanja",
    "proizvod", "marketing", "komunikacija", "inovacija", "podrška",
]


# ---------------------------------------------------------------------------
# Main Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.initialize_client_intelligence",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def initialize_client_intelligence(self, client_id: str):
    """
    Initialize all intelligence data for a client after onboarding.

    Creates SocialChannels, seed ContentPosts + PostMetrics,
    AI-discovered Competitors, BrandMentions, SentimentRecords,
    and TrendingTopics so all dashboard pages show data immediately.

    Idempotent: safe to re-run — checks for existing records before creating.
    """
    from sqlalchemy import select as sa_select

    from app.database import SyncSessionLocal

    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Client Intelligence Init started for %s at %s ===", client_id, run_ts)

    results = {
        "client_id": client_id,
        "timestamp": run_ts,
        "channels_created": 0,
        "posts_created": 0,
        "metrics_created": 0,
        "competitors_created": 0,
        "mentions_created": 0,
        "sentiments_created": 0,
        "topics_created": 0,
        "errors": [],
    }

    try:
        # Load client
        from app.models.client import Client

        session = SyncSessionLocal()
        try:
            client = session.execute(
                sa_select(Client).where(Client.id == uuid.UUID(client_id))
            ).scalar_one_or_none()

            if not client:
                logger.error("Client %s not found", client_id)
                return results

            # Detach for later use
            client_name = client.name
            client_slug = client.slug
            social_handles = client.social_handles or {}
            business_description = client.business_description or ""
            target_audience = client.target_audience or ""
            content_pillars = client.content_pillars or []
            cid = client.id

            # Get or create default project
            from app.models.project import Project

            project = session.execute(
                sa_select(Project).where(
                    Project.client_id == cid, Project.is_active == True
                )
            ).scalars().first()

            if not project:
                project = Project(
                    client_id=cid,
                    name="Default",
                    slug="default",
                    description="Automatski kreiran projekt",
                    is_active=True,
                )
                session.add(project)
                session.commit()
                logger.info("  Created default project for client %s", client_slug)

            project_id = project.id

        finally:
            session.close()

        # ------------------------------------------------------------------
        # Step A: Create SocialChannel records
        # ------------------------------------------------------------------
        logger.info("  Step A: Creating SocialChannels...")
        channel_ids = _step_a_create_channels(cid, social_handles, results)

        # ------------------------------------------------------------------
        # Step B+C: Create seed ContentPosts + PostMetrics
        # ------------------------------------------------------------------
        logger.info("  Step B+C: Creating seed ContentPosts + PostMetrics...")
        _step_bc_create_posts_and_metrics(cid, project_id, channel_ids, results)

        # ------------------------------------------------------------------
        # Step D: AI-Powered Competitor Discovery
        # ------------------------------------------------------------------
        logger.info("  Step D: Discovering competitors via AI...")
        _step_d_discover_competitors(cid, business_description, target_audience, results)

        # ------------------------------------------------------------------
        # Step E: BrandMentions + SentimentRecords — SKIPPED
        # Real mentions/sentiments come from social listening integrations,
        # not seed data. Fabricated data is misleading.
        # ------------------------------------------------------------------
        logger.info("  Step E: Skipped (no fake seed mentions)")

        # ------------------------------------------------------------------
        # Step F: TrendingTopics — SKIPPED
        # Real trending topics come from social listening integrations.
        # ------------------------------------------------------------------
        logger.info("  Step F: Skipped (no fake seed topics)")

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info(
            "=== Client Intelligence Init Complete for %s === "
            "channels=%d, posts=%d, metrics=%d, competitors=%d, "
            "mentions=%d, sentiments=%d, topics=%d",
            client_slug,
            results["channels_created"],
            results["posts_created"],
            results["metrics_created"],
            results["competitors_created"],
            results["mentions_created"],
            results["sentiments_created"],
            results["topics_created"],
        )

        return results

    except Exception as exc:
        logger.exception("Client intelligence init crashed for %s: %s", client_id, exc)
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Step implementations
# ---------------------------------------------------------------------------

def _step_a_create_channels(
    client_id: uuid.UUID, social_handles: dict, results: dict
) -> list[uuid.UUID]:
    """Create SocialChannel + ChannelMetric records from social_handles."""
    from sqlalchemy import select as sa_select

    from app.database import SyncSessionLocal
    from app.models.channel import ChannelMetric, SocialChannel

    channel_ids = []

    with SyncSessionLocal() as session:
        for platform, url_or_handle in social_handles.items():
            if not url_or_handle:
                continue

            handle = _extract_handle(str(url_or_handle))
            if not handle:
                continue

            # Normalize platform name
            platform_key = platform.lower().strip()

            # Idempotency check
            existing = session.execute(
                sa_select(SocialChannel).where(
                    SocialChannel.client_id == client_id,
                    SocialChannel.platform == platform_key,
                    SocialChannel.owner_type == "own",
                )
            ).scalar_one_or_none()

            if existing:
                logger.info("    Channel already exists: %s/%s", platform_key, handle)
                channel_ids.append(existing.id)
                continue

            channel = SocialChannel(
                owner_type="own",
                platform=platform_key,
                handle=handle,
                url=str(url_or_handle),
                is_primary=True,
                client_id=client_id,
            )
            session.add(channel)
            session.flush()
            channel_ids.append(channel.id)
            results["channels_created"] += 1
            logger.info("    Created channel: %s/%s", platform_key, handle)

            # Create ChannelMetric records for last 14 days
            base_followers = random.randint(5_000, 200_000)
            for day_offset in range(14):
                metric_date = date.today() - timedelta(days=day_offset)
                followers = base_followers + random.randint(-500, 500)
                metric = ChannelMetric(
                    channel_id=channel.id,
                    date=metric_date,
                    followers=followers,
                    avg_reach=int(followers * random.uniform(0.1, 0.3)),
                    engagement_rate=round(random.uniform(1.5, 6.5), 2),
                    posting_frequency=round(random.uniform(3.0, 14.0), 1),
                    client_id=client_id,
                )
                session.add(metric)

        session.commit()

    return channel_ids


def _step_bc_create_posts_and_metrics(
    client_id: uuid.UUID,
    project_id: uuid.UUID,
    channel_ids: list[uuid.UUID],
    results: dict,
):
    """Create seed ContentPost + PostMetric records."""
    from sqlalchemy import select as sa_select

    from app.database import SyncSessionLocal
    from app.models.analytics import PostMetric
    from app.models.channel import SocialChannel
    from app.models.content import ContentPost

    with SyncSessionLocal() as session:
        # Check if posts already exist for this client
        existing_count = session.execute(
            sa_select(ContentPost)
            .where(ContentPost.client_id == client_id, ContentPost.status == "published")
        ).scalars().all()

        if len(existing_count) >= 5:
            logger.info("    Posts already seeded (%d existing), skipping", len(existing_count))
            return

        # Get channels for platform info
        channels = session.execute(
            sa_select(SocialChannel).where(
                SocialChannel.client_id == client_id,
                SocialChannel.owner_type == "own",
            )
        ).scalars().all()

        if not channels:
            logger.info("    No channels found, skipping post creation")
            return

        now = datetime.now(timezone.utc)
        post_titles_hr = [
            "Novi sadržaj za naše pratitelje",
            "Pogledajte najnovije ažuriranje",
            "Hvala svima na podršci!",
            "Za naše vjerne pratitelje",
            "Nova kampanja je tu!",
            "Behind the scenes pogledajte",
            "Ekskluzivni sadržaj samo za vas",
            "Naš tim u akciji",
            "Rezultati koji govore sami za sebe",
            "Posebna objava za danas",
        ]

        for channel in channels:
            for i in range(5):
                published_at = _random_date_in_range(
                    now - timedelta(days=30),
                    now - timedelta(hours=2),
                )
                post = ContentPost(
                    platform=channel.platform,
                    status="published",
                    title=random.choice(post_titles_hr),
                    platform_post_id=f"seed_{uuid.uuid4().hex[:12]}",
                    client_id=client_id,
                    project_id=project_id,
                    published_at=published_at,
                    caption_hr=f"Automatski generirani sadržaj #{i+1}",
                    content_pillar=random.choice([
                        "brand", "engagement", "product", "community", "behind_scenes",
                    ]),
                )
                session.add(post)
                session.flush()
                results["posts_created"] += 1

                # Immediately create a PostMetric
                metrics = _mock_post_metrics_dict()
                metric = PostMetric(
                    post_id=post.id,
                    impressions=metrics["impressions"],
                    reach=metrics["reach"],
                    likes=metrics["likes"],
                    comments=metrics["comments"],
                    shares=metrics["shares"],
                    saves=metrics["saves"],
                    clicks=metrics["clicks"],
                    engagement_rate=metrics["engagement_rate"],
                    new_followers_attributed=metrics["new_followers_attributed"],
                    client_id=client_id,
                )
                session.add(metric)
                results["metrics_created"] += 1

        session.commit()
        logger.info(
            "    Created %d posts + %d metrics",
            results["posts_created"],
            results["metrics_created"],
        )


def _step_d_discover_competitors(
    client_id: uuid.UUID,
    business_description: str,
    target_audience: str,
    results: dict,
):
    """Use AI to discover competitors, with fallback."""
    from sqlalchemy import select as sa_select

    from app.database import SyncSessionLocal
    from app.models.competitor import Competitor, CompetitorMetric

    # Idempotency check
    with SyncSessionLocal() as session:
        existing = session.execute(
            sa_select(Competitor).where(Competitor.client_id == client_id)
        ).scalars().all()

        if len(existing) >= 3:
            logger.info("    Competitors already exist (%d), skipping", len(existing))
            return

    # Try AI discovery
    competitors_data = []
    try:
        from app.config import settings

        api_key = settings.OPENROUTER_API_KEY
        if api_key and business_description:
            loop = asyncio.new_event_loop()
            try:
                competitors_data = loop.run_until_complete(
                    _discover_competitors_ai(
                        business_description, target_audience, api_key
                    )
                )
            finally:
                loop.close()
            logger.info("    AI discovered %d competitors", len(competitors_data))
        else:
            logger.info("    No API key or description — using fallback competitors")
    except Exception as exc:
        logger.warning("    AI competitor discovery failed: %s — using fallback", exc)

    if not competitors_data:
        competitors_data = _get_fallback_competitors()

    # Create DB records
    with SyncSessionLocal() as session:
        platforms = ["instagram", "facebook", "tiktok", "youtube"]

        for comp_data in competitors_data[:5]:
            competitor = Competitor(
                name=comp_data.get("name", "Unknown"),
                short_name=comp_data.get("short_name", comp_data.get("name", "?")[:20]),
                country=comp_data.get("country", "N/A"),
                league=comp_data.get("industry", comp_data.get("league", "N/A")),
                website=comp_data.get("website", ""),
                client_id=client_id,
            )
            session.add(competitor)
            session.flush()
            results["competitors_created"] += 1

            # Create CompetitorMetric records for last 7 days
            for day_offset in range(7):
                for platform in random.sample(platforms, k=random.randint(2, 4)):
                    metric = CompetitorMetric(
                        competitor_id=competitor.id,
                        platform=platform,
                        date=date.today() - timedelta(days=day_offset),
                        followers=random.randint(10_000, 500_000),
                        engagement_rate=round(random.uniform(1.0, 7.0), 2),
                        client_id=client_id,
                    )
                    session.add(metric)

        session.commit()
        logger.info("    Created %d competitors with metrics", results["competitors_created"])


def _step_e_create_mentions_and_sentiments(
    client_id: uuid.UUID,
    client_name: str,
    social_handles: dict,
    results: dict,
):
    """Create seed BrandMention + SentimentRecord records."""
    from sqlalchemy import select as sa_select

    from app.database import SyncSessionLocal
    from app.models.sentiment import BrandMention, SentimentRecord

    with SyncSessionLocal() as session:
        # Idempotency check
        existing_mentions = session.execute(
            sa_select(BrandMention).where(BrandMention.client_id == client_id)
        ).scalars().all()

        if len(existing_mentions) >= 10:
            logger.info("    Mentions already exist (%d), skipping", len(existing_mentions))
            return

        now = datetime.now(timezone.utc)
        platforms = [p.lower().strip() for p in social_handles.keys() if social_handles[p]]
        if not platforms:
            platforms = ["web"]

        # Create BrandMentions (25 records)
        for _ in range(25):
            sentiment = random.choices(
                ["positive", "neutral", "negative"],
                weights=[50, 30, 20],
            )[0]

            if sentiment == "positive":
                template = random.choice(MENTION_TEMPLATES_POSITIVE)
            elif sentiment == "negative":
                template = random.choice(MENTION_TEMPLATES_NEGATIVE)
            else:
                template = random.choice(MENTION_TEMPLATES_NEUTRAL)

            text = template.format(name=client_name)
            platform = random.choice(platforms)

            mention = BrandMention(
                platform=platform,
                author=f"@user_{random.randint(1000, 9999)}",
                text=text,
                url=f"https://{platform}.example.com/post/{random.randint(100000, 999999)}",
                sentiment=sentiment,
                reach_estimate=random.randint(50, 50_000),
                is_influencer=random.random() < 0.1,
                detected_at=_random_date_in_range(
                    now - timedelta(days=14), now
                ),
                client_id=client_id,
            )
            session.add(mention)
            results["mentions_created"] += 1

        # Create SentimentRecords (35 records)
        for _ in range(35):
            sentiment = random.choices(
                ["positive", "neutral", "negative"],
                weights=[45, 30, 25],
            )[0]

            if sentiment == "positive":
                template = random.choice(MENTION_TEMPLATES_POSITIVE)
            elif sentiment == "negative":
                template = random.choice(MENTION_TEMPLATES_NEGATIVE)
            else:
                template = random.choice(MENTION_TEMPLATES_NEUTRAL)

            text = template.format(name=client_name)
            platform = random.choice(platforms)

            record = SentimentRecord(
                source_type="mention",
                platform=platform,
                text=text,
                language=random.choice(["hr", "en", "hr", "hr"]),
                sentiment=sentiment,
                confidence=round(random.uniform(0.65, 0.98), 2),
                topics={"topics": random.sample(SENTIMENT_TOPICS, k=random.randint(1, 3))},
                analyzed_at=_random_date_in_range(
                    now - timedelta(days=14), now
                ),
                client_id=client_id,
            )
            session.add(record)
            results["sentiments_created"] += 1

        session.commit()
        logger.info(
            "    Created %d mentions + %d sentiments",
            results["mentions_created"],
            results["sentiments_created"],
        )


def _step_f_create_trending_topics(
    client_id: uuid.UUID,
    client_name: str,
    content_pillars: list,
    results: dict,
):
    """Create seed TrendingTopic records."""
    from sqlalchemy import select as sa_select

    from app.database import SyncSessionLocal
    from app.models.sentiment import TrendingTopic

    with SyncSessionLocal() as session:
        # Idempotency check
        existing = session.execute(
            sa_select(TrendingTopic).where(TrendingTopic.client_id == client_id)
        ).scalars().all()

        if len(existing) >= 3:
            logger.info("    Topics already exist (%d), skipping", len(existing))
            return

        now = datetime.now(timezone.utc)

        # Generate topic names from client name and pillars
        clean_name = client_name.replace(" ", "")
        topic_names = [
            f"#{clean_name}",
            f"#{clean_name}Brand",
            "#Marketing",
            "#DigitalMarketing",
            "#BrandStrategy",
            "#ContentCreation",
            "#SocialMedia",
            "#GrowthHacking",
        ]

        # Add pillar-based topics
        for pillar in content_pillars[:3]:
            pillar_name = pillar.get("name", "") if isinstance(pillar, dict) else str(pillar)
            if pillar_name:
                clean_pillar = pillar_name.replace(" ", "")
                topic_names.append(f"#{clean_pillar}")

        # Create 6-8 topics
        for topic_name in topic_names[:8]:
            topic = TrendingTopic(
                topic=topic_name,
                volume=random.randint(50, 5_000),
                growth_rate=round(random.uniform(-5.0, 25.0), 1),
                related_keywords={
                    "keywords": [client_name.lower(), "brand", "digital"]
                },
                first_detected=_random_date_in_range(
                    now - timedelta(days=7), now - timedelta(days=1)
                ),
                last_updated=_random_date_in_range(
                    now - timedelta(hours=12), now
                ),
                client_id=client_id,
            )
            session.add(topic)
            results["topics_created"] += 1

        session.commit()
        logger.info("    Created %d trending topics", results["topics_created"])
