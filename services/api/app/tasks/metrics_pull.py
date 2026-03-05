"""
Dinamo Marketing Platform - Metrics Pull Task
Pulls metrics from all connected platforms (Meta, TikTok, YouTube, GA4)
for all active posts and ads. Runs every 15 minutes via Celery Beat.
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mock platform connectors
# ---------------------------------------------------------------------------

PLATFORMS = ["meta", "tiktok", "youtube", "ga4"]

MOCK_ACTIVE_POSTS = [
    {"id": "post_001", "platform": "meta", "type": "organic", "text": "Dinamo Zagreb matchday vibes!"},
    {"id": "post_002", "platform": "meta", "type": "ad", "campaign_id": "camp_101", "text": "Season ticket promo"},
    {"id": "post_003", "platform": "tiktok", "type": "organic", "text": "Behind the scenes training"},
    {"id": "post_004", "platform": "tiktok", "type": "ad", "campaign_id": "camp_102", "text": "Merch drop"},
    {"id": "post_005", "platform": "youtube", "type": "organic", "text": "Match highlights vs Hajduk"},
    {"id": "post_006", "platform": "youtube", "type": "ad", "campaign_id": "camp_103", "text": "UCL ticket sale"},
    {"id": "post_007", "platform": "meta", "type": "organic", "text": "Player interview - Petkovic"},
    {"id": "post_008", "platform": "meta", "type": "ad", "campaign_id": "camp_104", "text": "Fan zone event"},
]

MOCK_GA4_PROPERTIES = [
    {"property_id": "ga4_dinamo_web", "name": "dinamo.hr"},
    {"property_id": "ga4_dinamo_shop", "name": "shop.dinamo.hr"},
]


def _pull_meta_metrics(post: dict) -> dict:
    """Simulate pulling metrics from Meta Graph API."""
    is_ad = post["type"] == "ad"
    metrics = {
        "impressions": random.randint(5_000, 120_000),
        "reach": random.randint(3_000, 90_000),
        "likes": random.randint(100, 8_000),
        "comments": random.randint(10, 600),
        "shares": random.randint(5, 1_200),
        "saves": random.randint(2, 300),
        "engagement_rate": round(random.uniform(1.0, 8.5), 2),
    }
    if is_ad:
        metrics.update({
            "spend": round(random.uniform(10.0, 500.0), 2),
            "ctr": round(random.uniform(0.5, 4.5), 2),
            "cpc": round(random.uniform(0.05, 1.20), 2),
            "cpm": round(random.uniform(2.0, 15.0), 2),
            "conversions": random.randint(0, 200),
            "roas": round(random.uniform(0.8, 7.0), 2),
            "frequency": round(random.uniform(1.0, 6.0), 2),
        })
    return metrics


def _pull_tiktok_metrics(post: dict) -> dict:
    """Simulate pulling metrics from TikTok Business API."""
    is_ad = post["type"] == "ad"
    metrics = {
        "views": random.randint(10_000, 500_000),
        "likes": random.randint(500, 30_000),
        "comments": random.randint(20, 2_000),
        "shares": random.randint(10, 5_000),
        "avg_watch_time": round(random.uniform(2.0, 15.0), 1),
        "completion_rate": round(random.uniform(15.0, 75.0), 1),
        "engagement_rate": round(random.uniform(2.0, 12.0), 2),
    }
    if is_ad:
        metrics.update({
            "spend": round(random.uniform(15.0, 400.0), 2),
            "ctr": round(random.uniform(0.8, 5.0), 2),
            "cpc": round(random.uniform(0.03, 0.80), 2),
            "conversions": random.randint(0, 150),
            "roas": round(random.uniform(1.0, 8.0), 2),
            "frequency": round(random.uniform(1.0, 5.5), 2),
        })
    return metrics


def _pull_youtube_metrics(post: dict) -> dict:
    """Simulate pulling metrics from YouTube Data API."""
    is_ad = post["type"] == "ad"
    metrics = {
        "views": random.randint(2_000, 200_000),
        "likes": random.randint(50, 10_000),
        "dislikes": random.randint(0, 200),
        "comments": random.randint(5, 800),
        "avg_view_duration": round(random.uniform(30.0, 300.0), 1),
        "watch_time_hours": round(random.uniform(10.0, 5_000.0), 1),
        "subscribers_gained": random.randint(0, 500),
        "engagement_rate": round(random.uniform(1.5, 9.0), 2),
    }
    if is_ad:
        metrics.update({
            "spend": round(random.uniform(20.0, 600.0), 2),
            "cpv": round(random.uniform(0.01, 0.15), 3),
            "view_rate": round(random.uniform(15.0, 55.0), 1),
            "conversions": random.randint(0, 100),
            "roas": round(random.uniform(0.5, 6.0), 2),
            "frequency": round(random.uniform(1.0, 4.5), 2),
        })
    return metrics


def _pull_ga4_metrics(property_info: dict) -> dict:
    """Simulate pulling web analytics from GA4 Reporting API."""
    return {
        "property": property_info["name"],
        "sessions": random.randint(1_000, 50_000),
        "users": random.randint(800, 40_000),
        "new_users": random.randint(200, 15_000),
        "page_views": random.randint(3_000, 120_000),
        "avg_session_duration": round(random.uniform(30.0, 240.0), 1),
        "bounce_rate": round(random.uniform(25.0, 70.0), 1),
        "conversions": {
            "ticket_purchase": random.randint(0, 300),
            "merch_purchase": random.randint(0, 150),
            "newsletter_signup": random.randint(0, 500),
            "membership_signup": random.randint(0, 50),
        },
        "revenue": round(random.uniform(0.0, 25_000.0), 2),
        "top_channels": {
            "organic_social": round(random.uniform(15.0, 40.0), 1),
            "paid_social": round(random.uniform(10.0, 30.0), 1),
            "direct": round(random.uniform(10.0, 25.0), 1),
            "organic_search": round(random.uniform(5.0, 20.0), 1),
            "email": round(random.uniform(3.0, 15.0), 1),
        },
    }


PLATFORM_PULLERS = {
    "meta": _pull_meta_metrics,
    "tiktok": _pull_tiktok_metrics,
    "youtube": _pull_youtube_metrics,
}


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.pull_all_metrics",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def pull_all_metrics(self):
    """
    Pull metrics from all platforms for every active post and ad.

    Runs every 15 minutes. Stores the latest snapshot so dashboards stay
    fresh and optimization rules have current data to work with.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Metrics Pull started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "posts_processed": 0,
        "ads_processed": 0,
        "ga4_properties_processed": 0,
        "platforms": {p: {"success": 0, "failed": 0} for p in PLATFORMS},
        "errors": [],
    }

    try:
        # ------------------------------------------------------------------
        # 1. Pull post / ad metrics per platform
        # ------------------------------------------------------------------
        for post in MOCK_ACTIVE_POSTS:
            platform = post["platform"]
            puller = PLATFORM_PULLERS.get(platform)
            if puller is None:
                logger.warning("No puller for platform=%s, skipping post=%s", platform, post["id"])
                continue

            try:
                metrics = puller(post)
                logger.info(
                    "Pulled metrics for %s [%s/%s] -- impressions/views=%s, engagement_rate=%s%%",
                    post["id"],
                    platform,
                    post["type"],
                    metrics.get("impressions") or metrics.get("views"),
                    metrics.get("engagement_rate"),
                )

                if post["type"] == "ad":
                    results["ads_processed"] += 1
                    logger.info(
                        "  Ad %s -- spend=EUR%.2f, ctr=%.2f%%, roas=%.1fx, frequency=%.1f",
                        post["id"],
                        metrics.get("spend", 0),
                        metrics.get("ctr", 0),
                        metrics.get("roas", 0),
                        metrics.get("frequency", 0),
                    )
                else:
                    results["posts_processed"] += 1

                results["platforms"][platform]["success"] += 1

                # In production: upsert into metrics_snapshots table
                # db.execute(insert(MetricSnapshot).values(...).on_conflict_do_update(...))

            except Exception as exc:
                results["platforms"][platform]["failed"] += 1
                results["errors"].append({"post_id": post["id"], "error": str(exc)})
                logger.error("Failed to pull metrics for %s: %s", post["id"], exc)

        # ------------------------------------------------------------------
        # 2. Pull GA4 web analytics
        # ------------------------------------------------------------------
        for prop in MOCK_GA4_PROPERTIES:
            try:
                ga4_data = _pull_ga4_metrics(prop)
                results["ga4_properties_processed"] += 1
                results["platforms"]["ga4"]["success"] += 1
                logger.info(
                    "Pulled GA4 for %s -- sessions=%s, users=%s, revenue=EUR%.2f",
                    ga4_data["property"],
                    ga4_data["sessions"],
                    ga4_data["users"],
                    ga4_data["revenue"],
                )
            except Exception as exc:
                results["platforms"]["ga4"]["failed"] += 1
                results["errors"].append({"ga4_property": prop["property_id"], "error": str(exc)})
                logger.error("Failed to pull GA4 for %s: %s", prop["property_id"], exc)

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        total_ok = sum(p["success"] for p in results["platforms"].values())
        total_fail = sum(p["failed"] for p in results["platforms"].values())
        logger.info(
            "=== Metrics Pull complete -- posts=%d, ads=%d, ga4=%d, ok=%d, failed=%d ===",
            results["posts_processed"],
            results["ads_processed"],
            results["ga4_properties_processed"],
            total_ok,
            total_fail,
        )

        return results

    except Exception as exc:
        logger.exception("Metrics pull crashed: %s", exc)
        raise self.retry(exc=exc)
