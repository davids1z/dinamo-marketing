"""
ShiftOneZero Marketing Platform - Competitor Scanning Task
Scans all 8 competitor clubs for updated social media metrics.
Detects engagement spikes and generates competitive intelligence alerts.
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ENGAGEMENT_SPIKE_THRESHOLD = 1.5  # 50% above their own average = spike
FOLLOWER_GROWTH_ALERT_PCT = 2.0  # >2% weekly growth = alert
CONTENT_FREQUENCY_ALERT_MULTIPLIER = 1.8  # 80% more posts than usual

# ---------------------------------------------------------------------------
# Competitor club definitions
# ---------------------------------------------------------------------------

COMPETITORS = [
    {
        "id": "comp_001",
        "name": "Hajduk Split",
        "league": "HNL",
        "rivalry": "primary",
        "social_handles": {
            "facebook": "hajduk",
            "instagram": "hajduksplit",
            "twitter_x": "hajduksplit",
            "tiktok": "hajduksplit",
            "youtube": "hajduksplitofficial",
        },
        "baseline_engagement_rate": 4.5,
        "baseline_weekly_posts": 18,
        "prev_followers": {"facebook": 520_000, "instagram": 380_000, "twitter_x": 165_000, "tiktok": 95_000},
    },
    {
        "id": "comp_002",
        "name": "NK Osijek",
        "league": "HNL",
        "rivalry": "moderate",
        "social_handles": {
            "facebook": "nkosijek",
            "instagram": "nkosijek1947",
            "twitter_x": "nkosijek",
            "tiktok": "nkosijek",
        },
        "baseline_engagement_rate": 3.2,
        "baseline_weekly_posts": 12,
        "prev_followers": {"facebook": 85_000, "instagram": 62_000, "twitter_x": 28_000, "tiktok": 18_000},
    },
    {
        "id": "comp_003",
        "name": "HNK Rijeka",
        "league": "HNL",
        "rivalry": "moderate",
        "social_handles": {
            "facebook": "hnkrijeka",
            "instagram": "hnkrijeka",
            "twitter_x": "hnkrijeka",
            "tiktok": "hnkrijeka",
        },
        "baseline_engagement_rate": 3.0,
        "baseline_weekly_posts": 10,
        "prev_followers": {"facebook": 72_000, "instagram": 55_000, "twitter_x": 22_000, "tiktok": 15_000},
    },
    {
        "id": "comp_004",
        "name": "NK Lokomotiva",
        "league": "HNL",
        "rivalry": "local",
        "social_handles": {
            "facebook": "nklokomotiva",
            "instagram": "nklokomotiva",
            "twitter_x": "nklokomotiva",
        },
        "baseline_engagement_rate": 1.8,
        "baseline_weekly_posts": 6,
        "prev_followers": {"facebook": 15_000, "instagram": 10_000, "twitter_x": 5_500},
    },
    {
        "id": "comp_005",
        "name": "Red Star Belgrade",
        "league": "Serbian SuperLiga",
        "rivalry": "regional",
        "social_handles": {
            "facebook": "caborski",
            "instagram": "caborski",
            "twitter_x": "caborski",
            "tiktok": "caborski",
            "youtube": "fkcaborskirecent",
        },
        "baseline_engagement_rate": 5.2,
        "baseline_weekly_posts": 22,
        "prev_followers": {"facebook": 1_200_000, "instagram": 850_000, "twitter_x": 310_000, "tiktok": 220_000},
    },
    {
        "id": "comp_006",
        "name": "Partizan Belgrade",
        "league": "Serbian SuperLiga",
        "rivalry": "regional",
        "social_handles": {
            "facebook": "partizan",
            "instagram": "partizanbelgrade",
            "twitter_x": "partizanbelgrade",
            "tiktok": "partizan",
        },
        "baseline_engagement_rate": 4.0,
        "baseline_weekly_posts": 16,
        "prev_followers": {"facebook": 800_000, "instagram": 600_000, "twitter_x": 200_000, "tiktok": 130_000},
    },
    {
        "id": "comp_007",
        "name": "Ferencvaros",
        "league": "Hungarian NB I",
        "rivalry": "regional",
        "social_handles": {
            "facebook": "fradihu",
            "instagram": "fradihu",
            "twitter_x": "fradihu",
            "tiktok": "ferencvaros",
        },
        "baseline_engagement_rate": 4.8,
        "baseline_weekly_posts": 20,
        "prev_followers": {"facebook": 650_000, "instagram": 420_000, "twitter_x": 145_000, "tiktok": 180_000},
    },
    {
        "id": "comp_008",
        "name": "Olympiacos",
        "league": "Greek Super League",
        "rivalry": "ucl_tier",
        "social_handles": {
            "facebook": "olympiacosfc",
            "instagram": "olympiacosfc",
            "twitter_x": "olympiacos_org",
            "tiktok": "olympiacosfc",
            "youtube": "olympiacosfc",
        },
        "baseline_engagement_rate": 5.5,
        "baseline_weekly_posts": 24,
        "prev_followers": {"facebook": 2_500_000, "instagram": 1_800_000, "twitter_x": 680_000, "tiktok": 350_000},
    },
]


# ---------------------------------------------------------------------------
# Mock platform scanning
# ---------------------------------------------------------------------------

def _scan_competitor_socials(competitor: dict) -> dict:
    """Simulate scanning a competitor's social media metrics."""
    handles = competitor["social_handles"]
    platform_metrics = {}

    for platform, handle in handles.items():
        prev = competitor["prev_followers"].get(platform, 10_000)
        growth_pct = random.uniform(-0.5, 3.5)
        current_followers = int(prev * (1 + growth_pct / 100))

        platform_metrics[platform] = {
            "handle": handle,
            "followers": current_followers,
            "prev_followers": prev,
            "follower_change": current_followers - prev,
            "follower_growth_pct": round(growth_pct, 2),
            "posts_this_week": random.randint(
                max(1, int(competitor["baseline_weekly_posts"] * 0.5)),
                int(competitor["baseline_weekly_posts"] * 2.5),
            ),
            "engagement_rate": round(
                competitor["baseline_engagement_rate"] * random.uniform(0.5, 2.0), 2
            ),
            "avg_likes": random.randint(100, 15_000),
            "avg_comments": random.randint(5, 800),
            "top_post_engagement": random.randint(500, 50_000),
        }

    # Aggregate metrics
    total_followers = sum(m["followers"] for m in platform_metrics.values())
    total_prev = sum(m["prev_followers"] for m in platform_metrics.values())
    avg_engagement = (
        sum(m["engagement_rate"] for m in platform_metrics.values()) / len(platform_metrics)
        if platform_metrics else 0
    )
    total_posts = sum(m["posts_this_week"] for m in platform_metrics.values())

    return {
        "competitor_id": competitor["id"],
        "name": competitor["name"],
        "league": competitor["league"],
        "rivalry": competitor["rivalry"],
        "platforms": platform_metrics,
        "aggregate": {
            "total_followers": total_followers,
            "prev_total_followers": total_prev,
            "follower_change": total_followers - total_prev,
            "follower_growth_pct": round(
                ((total_followers - total_prev) / total_prev) * 100, 2
            ) if total_prev > 0 else 0,
            "avg_engagement_rate": round(avg_engagement, 2),
            "total_posts_this_week": total_posts,
            "baseline_weekly_posts": competitor["baseline_weekly_posts"],
        },
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }


def _detect_alerts(scan_result: dict, competitor: dict) -> list:
    """Detect noteworthy changes that warrant alerts."""
    alerts = []
    agg = scan_result["aggregate"]
    name = competitor["name"]

    # Engagement spike
    baseline_eng = competitor["baseline_engagement_rate"]
    if agg["avg_engagement_rate"] > baseline_eng * ENGAGEMENT_SPIKE_THRESHOLD:
        alerts.append({
            "type": "engagement_spike",
            "severity": "high",
            "competitor": name,
            "metric": "engagement_rate",
            "current": agg["avg_engagement_rate"],
            "baseline": baseline_eng,
            "multiplier": round(agg["avg_engagement_rate"] / baseline_eng, 2),
            "message": (
                f"{name} engagement spike: {agg['avg_engagement_rate']}% "
                f"vs {baseline_eng}% baseline ({agg['avg_engagement_rate']/baseline_eng:.1f}x)"
            ),
        })

    # Follower growth alert
    if agg["follower_growth_pct"] > FOLLOWER_GROWTH_ALERT_PCT:
        alerts.append({
            "type": "follower_growth",
            "severity": "medium",
            "competitor": name,
            "metric": "follower_growth",
            "growth_pct": agg["follower_growth_pct"],
            "follower_change": agg["follower_change"],
            "message": (
                f"{name} rapid follower growth: +{agg['follower_growth_pct']:.1f}% "
                f"(+{agg['follower_change']:,} followers this week)"
            ),
        })

    # Content frequency spike
    baseline_posts = competitor["baseline_weekly_posts"]
    if agg["total_posts_this_week"] > baseline_posts * CONTENT_FREQUENCY_ALERT_MULTIPLIER:
        alerts.append({
            "type": "content_frequency_spike",
            "severity": "medium",
            "competitor": name,
            "metric": "weekly_posts",
            "current": agg["total_posts_this_week"],
            "baseline": baseline_posts,
            "message": (
                f"{name} posting surge: {agg['total_posts_this_week']} posts this week "
                f"vs {baseline_posts} baseline -- possible campaign launch"
            ),
        })

    # Per-platform follower spike
    for platform, metrics in scan_result["platforms"].items():
        if metrics["follower_growth_pct"] > 5.0:
            alerts.append({
                "type": "platform_follower_spike",
                "severity": "low",
                "competitor": name,
                "platform": platform,
                "growth_pct": metrics["follower_growth_pct"],
                "message": (
                    f"{name} on {platform}: +{metrics['follower_growth_pct']:.1f}% follower growth"
                ),
            })

    return alerts


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.scan_all_competitors",
    max_retries=3,
    default_retry_delay=300,
    acks_late=True,
)
def scan_all_competitors(self):
    """
    Scan all 8 competitor clubs for updated social media metrics.

    Compares current performance against baselines and generates alerts
    for engagement spikes, follower growth, and content frequency changes.
    Runs every 12 hours via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Competitor Scan started at %s ===", run_ts)
    logger.info("Scanning %d competitors across HNL + regional rivals", len(COMPETITORS))

    results = {
        "timestamp": run_ts,
        "competitors_scanned": 0,
        "competitors_failed": 0,
        "total_alerts": 0,
        "scan_results": [],
        "alerts": [],
        "leaderboard": [],
        "errors": [],
    }

    try:
        for competitor in COMPETITORS:
            try:
                scan = _scan_competitor_socials(competitor)
                results["competitors_scanned"] += 1
                results["scan_results"].append(scan)

                agg = scan["aggregate"]
                logger.info(
                    "Scanned %s [%s] -- followers=%s (%+.1f%%), engagement=%.1f%%, posts=%d/wk",
                    scan["name"],
                    scan["rivalry"],
                    f"{agg['total_followers']:,}",
                    agg["follower_growth_pct"],
                    agg["avg_engagement_rate"],
                    agg["total_posts_this_week"],
                )

                # Detect alerts
                comp_alerts = _detect_alerts(scan, competitor)
                for alert in comp_alerts:
                    results["alerts"].append(alert)
                    logger.warning(
                        "ALERT [%s/%s]: %s",
                        alert["severity"],
                        alert["type"],
                        alert["message"],
                    )

            except Exception as exc:
                results["competitors_failed"] += 1
                results["errors"].append({"competitor": competitor["name"], "error": str(exc)})
                logger.error("Failed to scan %s: %s", competitor["name"], exc)

        results["total_alerts"] = len(results["alerts"])

        # ------------------------------------------------------------------
        # Build leaderboard by engagement rate
        # ------------------------------------------------------------------
        results["leaderboard"] = sorted(
            [
                {
                    "name": s["name"],
                    "rivalry": s["rivalry"],
                    "engagement_rate": s["aggregate"]["avg_engagement_rate"],
                    "total_followers": s["aggregate"]["total_followers"],
                    "weekly_posts": s["aggregate"]["total_posts_this_week"],
                }
                for s in results["scan_results"]
            ],
            key=lambda x: x["engagement_rate"],
            reverse=True,
        )

        logger.info("--- Competitor Engagement Leaderboard ---")
        for i, entry in enumerate(results["leaderboard"], 1):
            logger.info(
                "  #%d %s -- engagement=%.1f%%, followers=%s, posts=%d/wk",
                i, entry["name"], entry["engagement_rate"],
                f"{entry['total_followers']:,}", entry["weekly_posts"],
            )

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info("=== Competitor Scan Complete ===")
        logger.info("  Scanned: %d/%d competitors", results["competitors_scanned"], len(COMPETITORS))
        logger.info("  Alerts generated: %d", results["total_alerts"])
        high_alerts = [a for a in results["alerts"] if a["severity"] == "high"]
        if high_alerts:
            logger.warning("  HIGH severity alerts: %d", len(high_alerts))

        return results

    except Exception as exc:
        logger.exception("Competitor scan crashed: %s", exc)
        raise self.retry(exc=exc)
