"""
Dinamo Marketing Platform - Weekly Report Task
Generates a comprehensive weekly summary including top posts, best ads,
total spend, sentiment overview, and 3 AI-generated recommendations.
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPORT_PERIOD_DAYS = 7
TOP_POSTS_COUNT = 5
TOP_ADS_COUNT = 5
AI_RECOMMENDATIONS_COUNT = 3

# ---------------------------------------------------------------------------
# Mock data for report generation
# ---------------------------------------------------------------------------

MOCK_WEEKLY_POSTS = [
    {"id": "post_w01", "platform": "meta", "title": "Matchday vs Hajduk", "type": "image", "impressions": 145_000, "engagement_rate": 8.2, "likes": 12_500, "comments": 890, "shares": 2_100},
    {"id": "post_w02", "platform": "tiktok", "title": "Training Reel - Petkovic Skills", "type": "video", "impressions": 320_000, "engagement_rate": 11.5, "likes": 28_000, "comments": 1_500, "shares": 8_200},
    {"id": "post_w03", "platform": "youtube", "title": "UCL Highlights Compilation", "type": "video", "impressions": 95_000, "engagement_rate": 6.8, "likes": 5_200, "comments": 340, "shares": 1_800},
    {"id": "post_w04", "platform": "meta", "title": "New Kit Reveal 2026", "type": "carousel", "impressions": 210_000, "engagement_rate": 9.1, "likes": 18_000, "comments": 1_200, "shares": 3_500},
    {"id": "post_w05", "platform": "meta", "title": "Player Birthday - Captain", "type": "image", "impressions": 78_000, "engagement_rate": 7.4, "likes": 6_800, "comments": 420, "shares": 950},
    {"id": "post_w06", "platform": "tiktok", "title": "Fan Zone Atmosphere", "type": "video", "impressions": 180_000, "engagement_rate": 10.2, "likes": 15_000, "comments": 800, "shares": 4_500},
    {"id": "post_w07", "platform": "meta", "title": "Youth Academy Update", "type": "image", "impressions": 45_000, "engagement_rate": 4.2, "likes": 2_800, "comments": 150, "shares": 380},
    {"id": "post_w08", "platform": "instagram", "title": "Matchday Countdown Story", "type": "story", "impressions": 62_000, "engagement_rate": 5.5, "likes": 4_100, "comments": 0, "shares": 0},
]

MOCK_WEEKLY_ADS = [
    {"id": "ad_w01", "campaign": "Season Tickets", "platform": "meta", "spend": 1_250.00, "impressions": 185_000, "ctr": 3.8, "conversions": 145, "roas": 5.2, "cpc": 0.42},
    {"id": "ad_w02", "campaign": "Merch Spring Drop", "platform": "meta", "spend": 890.00, "impressions": 120_000, "ctr": 4.1, "conversions": 98, "roas": 4.8, "cpc": 0.38},
    {"id": "ad_w03", "campaign": "UCL Ticket Sale", "platform": "meta", "spend": 2_100.00, "impressions": 250_000, "ctr": 5.2, "conversions": 320, "roas": 6.1, "cpc": 0.31},
    {"id": "ad_w04", "campaign": "Membership Drive", "platform": "tiktok", "spend": 650.00, "impressions": 180_000, "ctr": 2.1, "conversions": 42, "roas": 2.8, "cpc": 0.55},
    {"id": "ad_w05", "campaign": "Fan Zone Events", "platform": "meta", "spend": 420.00, "impressions": 65_000, "ctr": 2.9, "conversions": 35, "roas": 3.5, "cpc": 0.48},
    {"id": "ad_w06", "campaign": "Youth Academy", "platform": "youtube", "spend": 380.00, "impressions": 45_000, "ctr": 2.5, "conversions": 18, "roas": 2.2, "cpc": 0.62},
]

MOCK_WEEKLY_SENTIMENT = {
    "total_comments_analyzed": 1_420,
    "positive": 812,
    "neutral": 398,
    "negative": 210,
    "positive_pct": 57.2,
    "neutral_pct": 28.0,
    "negative_pct": 14.8,
    "top_positive_themes": ["match_performance", "fan_experience", "new_kit"],
    "top_negative_themes": ["ticket_pricing", "stadium_facilities"],
    "sentiment_trend": "improving",  # vs previous week
    "alerts_generated": 3,
}

MOCK_AI_RECOMMENDATION_POOL = [
    {
        "id": "rec_01",
        "category": "content_strategy",
        "priority": "high",
        "title": "Double down on TikTok video content",
        "recommendation": (
            "TikTok videos are outperforming all other content types this week with "
            "11.5% average engagement rate (vs 6.8% platform average). Recommend "
            "increasing TikTok video output from 3 to 6 per week, focusing on "
            "behind-the-scenes training and player personality content."
        ),
        "expected_impact": "+35% total engagement",
        "effort": "medium",
    },
    {
        "id": "rec_02",
        "category": "ad_optimization",
        "priority": "high",
        "title": "Reallocate budget from YouTube to Meta UCL campaigns",
        "recommendation": (
            "Meta UCL Ticket Sale campaign is achieving 6.1x ROAS while YouTube Youth "
            "Academy is at 2.2x. Recommend shifting EUR200/week from YouTube to Meta UCL "
            "campaigns to maximize return during the Champions League surge period."
        ),
        "expected_impact": "+EUR1,200 weekly revenue",
        "effort": "low",
    },
    {
        "id": "rec_03",
        "category": "engagement",
        "priority": "medium",
        "title": "Address ticket pricing concerns proactively",
        "recommendation": (
            "Ticket pricing is the #1 negative sentiment theme (38% of negative comments). "
            "Recommend creating a content piece explaining the value proposition of Dinamo "
            "tickets vs. European averages, and promoting the family package discount."
        ),
        "expected_impact": "-20% negative sentiment on pricing",
        "effort": "medium",
    },
    {
        "id": "rec_04",
        "category": "content_strategy",
        "priority": "medium",
        "title": "Launch a weekly player spotlight series",
        "recommendation": (
            "Player birthday posts consistently get 7%+ engagement. A dedicated weekly "
            "player spotlight series (interview + stats + fan poll) could sustain this "
            "engagement throughout the week."
        ),
        "expected_impact": "+15% weekly engagement",
        "effort": "medium",
    },
    {
        "id": "rec_05",
        "category": "ad_optimization",
        "priority": "low",
        "title": "Test carousel format for merch campaigns",
        "recommendation": (
            "Carousel organic posts saw 9.1% engagement this week. Testing carousel "
            "format in the Merch Spring Drop campaign could improve CTR from the current "
            "4.1% by showing multiple products in a single ad unit."
        ),
        "expected_impact": "+0.5% CTR improvement",
        "effort": "low",
    },
    {
        "id": "rec_06",
        "category": "growth",
        "priority": "high",
        "title": "Activate Champions League surge content plan",
        "recommendation": (
            "With Bayern Munchen match in 5 days, now is the time to activate the full "
            "UCL surge content plan. Historical data shows 3x engagement during UCL weeks. "
            "Ensure all 6 planned content pieces are approved and scheduled."
        ),
        "expected_impact": "+200% reach during match week",
        "effort": "high",
    },
]


def _generate_weekly_summary() -> dict:
    """Generate the weekly performance summary."""
    now = datetime.now(timezone.utc)
    period_start = (now - timedelta(days=REPORT_PERIOD_DAYS)).isoformat()
    period_end = now.isoformat()

    # Sort posts by engagement rate for top posts
    sorted_posts = sorted(MOCK_WEEKLY_POSTS, key=lambda p: p["engagement_rate"], reverse=True)
    top_posts = sorted_posts[:TOP_POSTS_COUNT]

    # Sort ads by ROAS for best ads
    sorted_ads = sorted(MOCK_WEEKLY_ADS, key=lambda a: a["roas"], reverse=True)
    top_ads = sorted_ads[:TOP_ADS_COUNT]

    # Total spend
    total_spend = sum(a["spend"] for a in MOCK_WEEKLY_ADS)
    total_conversions = sum(a["conversions"] for a in MOCK_WEEKLY_ADS)
    total_ad_impressions = sum(a["impressions"] for a in MOCK_WEEKLY_ADS)
    total_organic_impressions = sum(p["impressions"] for p in MOCK_WEEKLY_POSTS)
    weighted_roas = sum(a["roas"] * a["spend"] for a in MOCK_WEEKLY_ADS) / total_spend if total_spend > 0 else 0

    # Select AI recommendations
    selected_recs = random.sample(
        MOCK_AI_RECOMMENDATION_POOL,
        min(AI_RECOMMENDATIONS_COUNT, len(MOCK_AI_RECOMMENDATION_POOL)),
    )

    return {
        "report_type": "weekly",
        "period": {
            "start": period_start,
            "end": period_end,
            "days": REPORT_PERIOD_DAYS,
        },
        "organic_performance": {
            "total_posts": len(MOCK_WEEKLY_POSTS),
            "total_impressions": total_organic_impressions,
            "avg_engagement_rate": round(
                sum(p["engagement_rate"] for p in MOCK_WEEKLY_POSTS) / len(MOCK_WEEKLY_POSTS), 2
            ),
            "total_likes": sum(p["likes"] for p in MOCK_WEEKLY_POSTS),
            "total_comments": sum(p["comments"] for p in MOCK_WEEKLY_POSTS),
            "total_shares": sum(p["shares"] for p in MOCK_WEEKLY_POSTS),
            "top_posts": [
                {
                    "id": p["id"],
                    "title": p["title"],
                    "platform": p["platform"],
                    "engagement_rate": p["engagement_rate"],
                    "impressions": p["impressions"],
                }
                for p in top_posts
            ],
        },
        "paid_performance": {
            "total_ads": len(MOCK_WEEKLY_ADS),
            "total_spend": round(total_spend, 2),
            "total_impressions": total_ad_impressions,
            "total_conversions": total_conversions,
            "weighted_roas": round(weighted_roas, 2),
            "avg_ctr": round(
                sum(a["ctr"] for a in MOCK_WEEKLY_ADS) / len(MOCK_WEEKLY_ADS), 2
            ),
            "avg_cpc": round(
                sum(a["cpc"] for a in MOCK_WEEKLY_ADS) / len(MOCK_WEEKLY_ADS), 2
            ),
            "top_ads": [
                {
                    "id": a["id"],
                    "campaign": a["campaign"],
                    "platform": a["platform"],
                    "roas": a["roas"],
                    "spend": a["spend"],
                    "conversions": a["conversions"],
                }
                for a in top_ads
            ],
        },
        "sentiment_overview": MOCK_WEEKLY_SENTIMENT,
        "ai_recommendations": selected_recs,
        "generated_at": now.isoformat(),
        "generated_by": "dinamo_marketing_platform_v1",
    }


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.generate_weekly_report",
    max_retries=3,
    default_retry_delay=300,
    acks_late=True,
)
def generate_weekly_report(self):
    """
    Generate the weekly marketing performance report.

    Includes: top posts, best performing ads, total spend, sentiment
    overview, and 3 AI-powered recommendations for the coming week.
    Runs every Monday at 08:00 via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Weekly Report Generation started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "report_generated": False,
        "report": None,
        "errors": [],
    }

    try:
        # ------------------------------------------------------------------
        # 1. Generate the weekly summary
        # ------------------------------------------------------------------
        report = _generate_weekly_summary()
        results["report"] = report
        results["report_generated"] = True

        # ------------------------------------------------------------------
        # 2. Log key metrics
        # ------------------------------------------------------------------
        org = report["organic_performance"]
        paid = report["paid_performance"]
        sent = report["sentiment_overview"]

        logger.info("--- WEEKLY REPORT: %s to %s ---", report["period"]["start"][:10], report["period"]["end"][:10])
        logger.info("")

        # Organic
        logger.info("ORGANIC PERFORMANCE:")
        logger.info("  Posts: %d", org["total_posts"])
        logger.info("  Impressions: %s", f"{org['total_impressions']:,}")
        logger.info("  Avg engagement rate: %.1f%%", org["avg_engagement_rate"])
        logger.info("  Total engagement: %s likes, %s comments, %s shares",
                     f"{org['total_likes']:,}", f"{org['total_comments']:,}", f"{org['total_shares']:,}")
        logger.info("  Top posts:")
        for i, p in enumerate(org["top_posts"], 1):
            logger.info("    #%d \"%s\" [%s] -- %.1f%% engagement, %s impressions",
                         i, p["title"], p["platform"], p["engagement_rate"], f"{p['impressions']:,}")

        logger.info("")

        # Paid
        logger.info("PAID PERFORMANCE:")
        logger.info("  Active ads: %d", paid["total_ads"])
        logger.info("  Total spend: EUR%.2f", paid["total_spend"])
        logger.info("  Impressions: %s", f"{paid['total_impressions']:,}")
        logger.info("  Conversions: %d", paid["total_conversions"])
        logger.info("  Weighted ROAS: %.1fx", paid["weighted_roas"])
        logger.info("  Avg CTR: %.1f%%, Avg CPC: EUR%.2f", paid["avg_ctr"], paid["avg_cpc"])
        logger.info("  Best ads:")
        for i, a in enumerate(paid["top_ads"], 1):
            logger.info("    #%d \"%s\" [%s] -- ROAS=%.1fx, EUR%.2f spend, %d conversions",
                         i, a["campaign"], a["platform"], a["roas"], a["spend"], a["conversions"])

        logger.info("")

        # Sentiment
        logger.info("SENTIMENT OVERVIEW:")
        logger.info("  Comments analyzed: %s", f"{sent['total_comments_analyzed']:,}")
        logger.info("  Positive: %.1f%%, Neutral: %.1f%%, Negative: %.1f%%",
                     sent["positive_pct"], sent["neutral_pct"], sent["negative_pct"])
        logger.info("  Trend vs last week: %s", sent["sentiment_trend"])
        logger.info("  Top positive themes: %s", ", ".join(sent["top_positive_themes"]))
        logger.info("  Top negative themes: %s", ", ".join(sent["top_negative_themes"]))

        logger.info("")

        # AI Recommendations
        logger.info("AI RECOMMENDATIONS:")
        for i, rec in enumerate(report["ai_recommendations"], 1):
            logger.info("  %d. [%s/%s] %s", i, rec["category"], rec["priority"], rec["title"])
            logger.info("     %s", rec["recommendation"][:120] + "...")
            logger.info("     Expected impact: %s | Effort: %s", rec["expected_impact"], rec["effort"])

        # ------------------------------------------------------------------
        # In production: store report and send notifications
        # ------------------------------------------------------------------
        # db.execute(insert(WeeklyReport).values(data=json.dumps(report)))
        # send_email(to="marketing@dinamo.hr", subject="Weekly Report", body=report)
        # send_slack(channel="#marketing-reports", report=report)

        logger.info("")
        logger.info("=== Weekly Report generated successfully ===")

        return results

    except Exception as exc:
        logger.exception("Weekly report generation crashed: %s", exc)
        raise self.retry(exc=exc)
