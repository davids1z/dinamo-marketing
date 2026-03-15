"""
ShiftOneZero Marketing Platform - Social Listening Task
Scans for brand mentions across platforms, detects trending topics,
and flags spikes in mention volume for rapid response.
"""

import logging
import random
from datetime import datetime, timedelta, timezone
from collections import Counter

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BRAND_KEYWORDS = [
    "Demo Brand",
    "@demo_brand",
    "#DemoBrand",
    "#OurBrand",
    "DemoBrand",
]

COMPETITOR_KEYWORDS = [
    "Hajduk Split",
    "Rijeka",
    "Osijek",
    "Lokomotiva",
]

PLATFORMS_TO_SCAN = ["twitter_x", "instagram", "facebook", "tiktok", "reddit", "youtube", "news_rss"]

# Baseline daily mention count (used to detect spikes)
BASELINE_DAILY_MENTIONS = 350
SPIKE_THRESHOLD_MULTIPLIER = 2.0  # 2x baseline = spike

# ---------------------------------------------------------------------------
# Mock data generators
# ---------------------------------------------------------------------------

MOCK_MENTION_TEMPLATES = [
    {"author": "@brandfan92", "platform": "twitter_x", "text": "Demo Brand going strong this season! #DemoBrand #OurBrand", "sentiment": "positive"},
    {"author": "@news_portal", "platform": "twitter_x", "text": "Demo Brand announces new product -- fans react", "sentiment": "neutral"},
    {"author": "brandultra", "platform": "instagram", "text": "Event atmosphere was INSANE tonight #DemoBrand", "sentiment": "positive"},
    {"author": "haters_gonna_hate", "platform": "twitter_x", "text": "Demo Brand service was awful today, embarrassing", "sentiment": "negative"},
    {"author": "fan_zone", "platform": "facebook", "text": "Who's coming to the Demo Brand fan zone this Saturday?", "sentiment": "positive"},
    {"author": "news_site", "platform": "news_rss", "text": "Demo Brand financial report shows record revenue", "sentiment": "neutral"},
    {"author": "@industry_watch", "platform": "twitter_x", "text": "Demo Brand vs competitors -- the market preview", "sentiment": "neutral"},
    {"author": "tiktok_reviewer", "platform": "tiktok", "text": "This Demo Brand product is absolutely amazing #DemoBrand", "sentiment": "positive"},
    {"author": "r/industry", "platform": "reddit", "text": "Discussion thread: Demo Brand new launch. Expecting big things.", "sentiment": "neutral"},
    {"author": "@angry_customer", "platform": "twitter_x", "text": "Management needs to go. Demo Brand deserves better leadership #DemoBrand", "sentiment": "negative"},
    {"author": "youtube_reviews", "platform": "youtube", "text": "Demo Brand -- Year Review 2025/26 | All Highlights", "sentiment": "positive"},
    {"author": "@brandlive", "platform": "twitter_x", "text": "Another milestone! Demo Brand leading the way! #DemoBrand", "sentiment": "positive"},
    {"author": "news_portal_24", "platform": "news_rss", "text": "Demo Brand expansion plans unveiled", "sentiment": "neutral"},
    {"author": "@disappointed_customer", "platform": "instagram", "text": "Prices are a joke. Demo Brand pricing out real customers.", "sentiment": "negative"},
    {"author": "merch_reviewer", "platform": "tiktok", "text": "New Demo Brand 2026 collection review -- is it worth it? #DemoBrand", "sentiment": "neutral"},
]

TRENDING_TOPIC_POOL = [
    {"topic": "#DemoBrand", "category": "brand"},
    {"topic": "#OurBrand", "category": "brand"},
    {"topic": "#BrandLaunch", "category": "campaign"},
    {"topic": "#BrandVsCompetitor", "category": "competition"},
    {"topic": "#BrandNews", "category": "news"},
    {"topic": "#BrandCommunity", "category": "community"},
    {"topic": "#BrandFans", "category": "fans"},
    {"topic": "#Industry", "category": "industry"},
]


def _build_client_keywords(client) -> list[str]:
    """Build brand keywords from client data instead of using hardcoded globals."""
    keywords = [client.name]

    # Extract handles from social_handles JSON
    handles = getattr(client, "social_handles", None) or {}
    if isinstance(handles, dict):
        for platform, url_or_handle in handles.items():
            if not isinstance(url_or_handle, str) or not url_or_handle:
                continue
            # Extract clean handle from URL
            clean = url_or_handle.strip().rstrip("/")
            if "://" in clean:
                clean = clean.split("://", 1)[1]
            parts = clean.split("/")
            handle = parts[-1] if parts else ""
            if handle and handle not in ("www", ""):
                keywords.append(f"@{handle}")
                keywords.append(f"#{handle}")

    # Add brand name as hashtag (remove spaces)
    clean_name = client.name.replace(" ", "")
    if clean_name:
        keywords.append(f"#{clean_name}")

    # Fallback to global keywords if nothing useful was derived
    if len(keywords) <= 1:
        return BRAND_KEYWORDS

    return keywords


def _simulate_mention_scan(platform: str) -> list:
    """Simulate scanning a platform for brand mentions."""
    count = random.randint(5, 60)
    mentions = []
    for _ in range(count):
        template = random.choice(MOCK_MENTION_TEMPLATES)
        mention = {
            "id": f"mention_{random.randint(100000, 999999)}",
            "platform": platform,
            "author": template["author"],
            "text": template["text"],
            "sentiment": template["sentiment"],
            "keyword_matched": random.choice(BRAND_KEYWORDS),
            "reach_estimate": random.randint(50, 50_000),
            "engagement": random.randint(0, 500),
            "timestamp": (
                datetime.now(timezone.utc) - timedelta(minutes=random.randint(1, 120))
            ).isoformat(),
            "language": random.choice(["hr", "en", "en", "hr", "de"]),
            "url": f"https://{platform}.example.com/post/{random.randint(100000, 999999)}",
        }
        mentions.append(mention)
    return mentions


def _detect_trending_topics(all_mentions: list) -> list:
    """Detect trending topics from mention texts using simple keyword frequency."""
    word_counter = Counter()
    for m in all_mentions:
        words = m["text"].split()
        for word in words:
            if word.startswith("#") and len(word) > 2:
                word_counter[word.lower()] += 1

    trending = []
    for hashtag, count in word_counter.most_common(10):
        if count >= 3:
            known = next((t for t in TRENDING_TOPIC_POOL if t["topic"].lower() == hashtag), None)
            trending.append({
                "topic": hashtag,
                "mention_count": count,
                "category": known["category"] if known else "unknown",
                "velocity": round(random.uniform(1.2, 5.0), 1),  # mentions per hour
            })
    return trending


def _check_for_spikes(platform_counts: dict) -> list:
    """Check if any platform has a mention spike above baseline."""
    total_mentions = sum(platform_counts.values())
    alerts = []

    if total_mentions > BASELINE_DAILY_MENTIONS * SPIKE_THRESHOLD_MULTIPLIER:
        alerts.append({
            "type": "overall_spike",
            "severity": "high",
            "total_mentions": total_mentions,
            "baseline": BASELINE_DAILY_MENTIONS,
            "multiplier": round(total_mentions / BASELINE_DAILY_MENTIONS, 2),
            "message": f"Total mentions ({total_mentions}) exceeded {SPIKE_THRESHOLD_MULTIPLIER}x baseline ({BASELINE_DAILY_MENTIONS})",
        })

    for platform, count in platform_counts.items():
        per_platform_baseline = BASELINE_DAILY_MENTIONS / len(PLATFORMS_TO_SCAN)
        if count > per_platform_baseline * 3:
            alerts.append({
                "type": "platform_spike",
                "severity": "medium",
                "platform": platform,
                "count": count,
                "message": f"Spike on {platform}: {count} mentions (3x platform baseline)",
            })

    return alerts


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.scan_brand_mentions",
    max_retries=3,
    default_retry_delay=120,
    acks_late=True,
)
def scan_brand_mentions(self):
    """
    Scan all platforms for brand mentions.

    Iterates over all active clients. For each client, detects trending
    topics and alerts on mention volume spikes.
    Runs every 30 minutes via Celery Beat.
    """
    from app.database import SyncSessionLocal
    from app.models.client import Client
    from sqlalchemy import select as sa_select

    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Social Listening scan started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "clients_processed": 0,
        "total_mentions": 0,
        "platform_counts": {},
        "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
        "trending_topics": [],
        "alerts": [],
        "top_mentions": [],
        "errors": [],
    }

    try:
        # 0. Load all active clients
        session = SyncSessionLocal()
        try:
            clients = session.execute(
                sa_select(Client).where(Client.is_active == True)
            ).scalars().all()
            for c in clients:
                session.expunge(c)
        finally:
            session.close()

        if not clients:
            logger.info("  No active clients found")
            return results

        logger.info("  Found %d active clients", len(clients))

        for client in clients:
            logger.info("  Processing client: %s (%s)", client.name, client.id)
            results["clients_processed"] += 1

            # Build client-specific brand keywords from client data
            client_keywords = _build_client_keywords(client)
            logger.info("  Tracking keywords: %s", ", ".join(client_keywords))

            all_mentions = []

            # ------------------------------------------------------------------
            # 1. Scan each platform
            # ------------------------------------------------------------------
            client_platform_counts = {}
            for platform in PLATFORMS_TO_SCAN:
                try:
                    mentions = _simulate_mention_scan(platform)
                    for m in mentions:
                        m["client_id"] = str(client.id)
                    all_mentions.extend(mentions)
                    client_platform_counts[platform] = len(mentions)
                    results["platform_counts"][platform] = results["platform_counts"].get(platform, 0) + len(mentions)
                    logger.info("  Scanned %s -- found %d mentions", platform, len(mentions))
                except Exception as exc:
                    results["errors"].append({"platform": platform, "client_id": str(client.id), "error": str(exc)})
                    logger.error("  Failed to scan %s: %s", platform, exc)

            results["total_mentions"] += len(all_mentions)

            # ------------------------------------------------------------------
            # 2. Aggregate sentiment
            # ------------------------------------------------------------------
            for m in all_mentions:
                sentiment = m.get("sentiment", "neutral")
                if sentiment in results["sentiment_breakdown"]:
                    results["sentiment_breakdown"][sentiment] += 1

            # Alert if negative ratio is high for this client
            client_total = len(all_mentions)
            if client_total > 0:
                client_neg = sum(1 for m in all_mentions if m.get("sentiment") == "negative")
                neg_ratio = client_neg / client_total
                if neg_ratio > 0.30:
                    alert = {
                        "type": "negative_sentiment_spike",
                        "severity": "high",
                        "client_id": str(client.id),
                        "negative_ratio": round(neg_ratio * 100, 1),
                        "message": f"Negative sentiment at {neg_ratio*100:.1f}% -- exceeds 30% threshold (client: {client.name})",
                    }
                    results["alerts"].append(alert)
                    logger.warning("ALERT: %s", alert["message"])

            # ------------------------------------------------------------------
            # 3. Detect trending topics
            # ------------------------------------------------------------------
            client_trending = _detect_trending_topics(all_mentions)
            results["trending_topics"].extend(client_trending)
            for topic in client_trending:
                logger.info(
                    "  Trending: %s (count=%d, velocity=%.1f/hr, category=%s)",
                    topic["topic"], topic["mention_count"], topic["velocity"], topic["category"],
                )

            # ------------------------------------------------------------------
            # 4. Check for volume spikes
            # ------------------------------------------------------------------
            spike_alerts = _check_for_spikes(client_platform_counts)
            for alert in spike_alerts:
                alert["client_id"] = str(client.id)
            results["alerts"].extend(spike_alerts)
            for alert in spike_alerts:
                logger.warning("ALERT [%s] (client=%s): %s", alert["severity"], client.name, alert["message"])

            # ------------------------------------------------------------------
            # 5. Capture top mentions by reach
            # ------------------------------------------------------------------
            all_mentions.sort(key=lambda m: m.get("reach_estimate", 0), reverse=True)
            results["top_mentions"].extend(all_mentions[:5])

        # Log top mentions across all clients
        for m in results["top_mentions"][:10]:
            logger.info(
                "Top mention: @%s on %s (reach=%d)",
                m["author"], m["platform"], m["reach_estimate"],
            )

        pos = results["sentiment_breakdown"]["positive"]
        neu = results["sentiment_breakdown"]["neutral"]
        neg = results["sentiment_breakdown"]["negative"]
        logger.info(
            "Sentiment breakdown -- positive=%d, neutral=%d, negative=%d",
            pos, neu, neg,
        )

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info(
            "=== Social Listening complete -- %d clients, %d mentions, %d trending topics, %d alerts ===",
            results["clients_processed"],
            results["total_mentions"],
            len(results["trending_topics"]),
            len(results["alerts"]),
        )

        return results

    except Exception as exc:
        logger.exception("Social listening scan crashed: %s", exc)
        raise self.retry(exc=exc)
