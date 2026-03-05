"""
Dinamo Marketing Platform - Social Listening Task
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
    "Dinamo Zagreb",
    "GNK Dinamo",
    "#GNKD",
    "#Dinamo",
    "Dinamo",
    "Maksimir",
    "Plavi",  # "The Blues" -- common fan nickname
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
    {"author": "@dinamofan92", "platform": "twitter_x", "text": "Dinamo Zagreb going all the way in UCL this season! #GNKD #UCL", "sentiment": "positive"},
    {"author": "@sportske_novosti", "platform": "twitter_x", "text": "GNK Dinamo announces new signing -- fans react", "sentiment": "neutral"},
    {"author": "dinamoultra", "platform": "instagram", "text": "Maksimir atmosphere was INSANE tonight #Dinamo", "sentiment": "positive"},
    {"author": "haters_gonna_hate", "platform": "twitter_x", "text": "Dinamo Zagreb defence was awful today, embarrassing", "sentiment": "negative"},
    {"author": "fan_zone_zg", "platform": "facebook", "text": "Who's coming to the Dinamo fan zone this Saturday?", "sentiment": "positive"},
    {"author": "index.hr", "platform": "news_rss", "text": "Dinamo Zagreb financial report shows record revenue", "sentiment": "neutral"},
    {"author": "@balkan_futbol", "platform": "twitter_x", "text": "Dinamo Zagreb vs Hajduk Split -- the eternal derby preview", "sentiment": "neutral"},
    {"author": "tiktok_footy", "platform": "tiktok", "text": "This Dinamo Zagreb goal is absolutely filthy #GNKD", "sentiment": "positive"},
    {"author": "r/croatianfootball", "platform": "reddit", "text": "Match thread: Dinamo vs Rijeka. Expecting a tough game.", "sentiment": "neutral"},
    {"author": "@angry_plavi", "platform": "twitter_x", "text": "Board needs to go. Dinamo Zagreb deserves better management #GNKD", "sentiment": "negative"},
    {"author": "youtube_sports_hr", "platform": "youtube", "text": "Dinamo Zagreb -- Season Review 2025/26 | All Goals & Assists", "sentiment": "positive"},
    {"author": "@dinamolive", "platform": "twitter_x", "text": "Petkovic scores again! Dinamo 2-0 up! #Dinamo #HNL", "sentiment": "positive"},
    {"author": "news_portal_24sata", "platform": "news_rss", "text": "GNK Dinamo stadium renovation plans unveiled", "sentiment": "neutral"},
    {"author": "@disappointed_fan", "platform": "instagram", "text": "Ticket prices are a joke. Dinamo Zagreb pricing out real fans.", "sentiment": "negative"},
    {"author": "merch_reviewer", "platform": "tiktok", "text": "New Dinamo Zagreb 2026 kit review -- is it worth it? #Dinamo", "sentiment": "neutral"},
]

TRENDING_TOPIC_POOL = [
    {"topic": "#DinamoZagreb", "category": "brand"},
    {"topic": "#GNKD", "category": "brand"},
    {"topic": "#UCLDinamo", "category": "competition"},
    {"topic": "#EternalDerby", "category": "rivalry"},
    {"topic": "#DinamoTransfers", "category": "transfers"},
    {"topic": "#Maksimir", "category": "venue"},
    {"topic": "#PlaviArmy", "category": "fans"},
    {"topic": "#HNL", "category": "league"},
]


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
    Scan all platforms for brand mentions of Dinamo Zagreb.

    Detects trending topics and alerts on mention volume spikes.
    Runs every 30 minutes via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Social Listening scan started at %s ===", run_ts)
    logger.info("Tracking keywords: %s", ", ".join(BRAND_KEYWORDS))

    results = {
        "timestamp": run_ts,
        "total_mentions": 0,
        "platform_counts": {},
        "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
        "trending_topics": [],
        "alerts": [],
        "top_mentions": [],
        "errors": [],
    }

    all_mentions = []

    try:
        # ------------------------------------------------------------------
        # 1. Scan each platform
        # ------------------------------------------------------------------
        for platform in PLATFORMS_TO_SCAN:
            try:
                mentions = _simulate_mention_scan(platform)
                all_mentions.extend(mentions)
                results["platform_counts"][platform] = len(mentions)
                logger.info("Scanned %s -- found %d mentions", platform, len(mentions))
            except Exception as exc:
                results["errors"].append({"platform": platform, "error": str(exc)})
                logger.error("Failed to scan %s: %s", platform, exc)

        results["total_mentions"] = len(all_mentions)

        # ------------------------------------------------------------------
        # 2. Aggregate sentiment
        # ------------------------------------------------------------------
        for m in all_mentions:
            sentiment = m.get("sentiment", "neutral")
            if sentiment in results["sentiment_breakdown"]:
                results["sentiment_breakdown"][sentiment] += 1

        pos = results["sentiment_breakdown"]["positive"]
        neu = results["sentiment_breakdown"]["neutral"]
        neg = results["sentiment_breakdown"]["negative"]
        logger.info(
            "Sentiment breakdown -- positive=%d, neutral=%d, negative=%d",
            pos, neu, neg,
        )

        # Alert if negative ratio is high
        if results["total_mentions"] > 0:
            neg_ratio = neg / results["total_mentions"]
            if neg_ratio > 0.30:
                alert = {
                    "type": "negative_sentiment_spike",
                    "severity": "high",
                    "negative_ratio": round(neg_ratio * 100, 1),
                    "message": f"Negative sentiment at {neg_ratio*100:.1f}% -- exceeds 30% threshold",
                }
                results["alerts"].append(alert)
                logger.warning("ALERT: %s", alert["message"])

        # ------------------------------------------------------------------
        # 3. Detect trending topics
        # ------------------------------------------------------------------
        results["trending_topics"] = _detect_trending_topics(all_mentions)
        for topic in results["trending_topics"]:
            logger.info(
                "Trending: %s (count=%d, velocity=%.1f/hr, category=%s)",
                topic["topic"], topic["mention_count"], topic["velocity"], topic["category"],
            )

        # ------------------------------------------------------------------
        # 4. Check for volume spikes
        # ------------------------------------------------------------------
        spike_alerts = _check_for_spikes(results["platform_counts"])
        results["alerts"].extend(spike_alerts)
        for alert in spike_alerts:
            logger.warning("ALERT [%s]: %s", alert["severity"], alert["message"])

        # ------------------------------------------------------------------
        # 5. Capture top mentions by reach
        # ------------------------------------------------------------------
        all_mentions.sort(key=lambda m: m.get("reach_estimate", 0), reverse=True)
        results["top_mentions"] = all_mentions[:5]
        for m in results["top_mentions"]:
            logger.info(
                "Top mention: @%s on %s (reach=%d) -- \"%s\"",
                m["author"], m["platform"], m["reach_estimate"], m["text"][:80],
            )

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info(
            "=== Social Listening complete -- %d mentions across %d platforms, %d trending topics, %d alerts ===",
            results["total_mentions"],
            len(results["platform_counts"]),
            len(results["trending_topics"]),
            len(results["alerts"]),
        )

        return results

    except Exception as exc:
        logger.exception("Social listening scan crashed: %s", exc)
        raise self.retry(exc=exc)
