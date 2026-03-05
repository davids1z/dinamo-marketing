"""
Dinamo Marketing Platform - Monthly Cycle Task
Full monthly cycle: generate monthly report PDF, create new content plan
for next month, and update market position scores.
"""

import logging
import random
from datetime import datetime, timedelta, timezone
from calendar import monthrange

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CONTENT_POSTS_PER_WEEK = 20
CONTENT_CATEGORIES = ["matchday", "behind_the_scenes", "player_spotlight", "fan_engagement", "commercial", "community", "ucl"]
PLATFORMS = ["facebook", "instagram", "twitter_x", "tiktok", "youtube", "linkedin"]

# ---------------------------------------------------------------------------
# Mock monthly data
# ---------------------------------------------------------------------------

MOCK_MONTHLY_ORGANIC = {
    "total_posts": 85,
    "total_impressions": 4_200_000,
    "total_reach": 2_800_000,
    "avg_engagement_rate": 7.3,
    "total_likes": 285_000,
    "total_comments": 18_500,
    "total_shares": 42_000,
    "followers_gained": {
        "facebook": 3_200,
        "instagram": 5_800,
        "twitter_x": 1_400,
        "tiktok": 8_500,
        "youtube": 2_100,
        "linkedin": 450,
    },
    "top_content_category": "matchday",
    "best_posting_times": {"weekday": "Tuesday", "hour": 19},
}

MOCK_MONTHLY_PAID = {
    "total_campaigns": 8,
    "total_spend": 18_500.00,
    "total_impressions": 3_200_000,
    "total_conversions": 2_450,
    "total_revenue": 82_500.00,
    "weighted_roas": 4.46,
    "avg_ctr": 3.4,
    "avg_cpc": 0.45,
    "budget_utilization_pct": 87.5,
    "best_campaign": {"name": "UCL Ticket Sale", "roas": 6.1, "spend": 5_200.00},
    "worst_campaign": {"name": "Youth Academy", "roas": 2.2, "spend": 1_100.00},
}

MOCK_MONTHLY_SENTIMENT = {
    "total_analyzed": 5_800,
    "positive_pct": 58.2,
    "neutral_pct": 27.5,
    "negative_pct": 14.3,
    "nps_estimate": 42,
    "trend": "stable",
    "alerts_generated": 12,
    "response_rate_pct": 78.5,
    "avg_response_time_min": 45,
}

MOCK_MARKET_POSITION = {
    "dinamo_engagement_rate": 7.3,
    "league_avg_engagement_rate": 3.8,
    "position_in_league": 1,
    "regional_position": 3,
    "engagement_index": 1.92,  # dinamo / league avg
    "follower_share_pct": 38.5,  # % of total HNL followers
    "brand_mention_share": 42.1,  # share of voice
}


# ---------------------------------------------------------------------------
# Monthly report generation
# ---------------------------------------------------------------------------

def _generate_monthly_report() -> dict:
    """Generate the full monthly performance report."""
    now = datetime.now(timezone.utc)
    year = now.year
    month = now.month - 1 if now.month > 1 else 12
    report_year = year if now.month > 1 else year - 1
    days_in_month = monthrange(report_year, month)[1]

    return {
        "report_type": "monthly",
        "period": {
            "year": report_year,
            "month": month,
            "days": days_in_month,
            "start": f"{report_year}-{month:02d}-01",
            "end": f"{report_year}-{month:02d}-{days_in_month}",
        },
        "executive_summary": {
            "headline": f"Strong month with {MOCK_MONTHLY_PAID['weighted_roas']:.1f}x ROAS and {MOCK_MONTHLY_ORGANIC['avg_engagement_rate']}% engagement",
            "total_reach": MOCK_MONTHLY_ORGANIC["total_reach"],
            "total_engagement": MOCK_MONTHLY_ORGANIC["total_likes"] + MOCK_MONTHLY_ORGANIC["total_comments"] + MOCK_MONTHLY_ORGANIC["total_shares"],
            "total_spend": MOCK_MONTHLY_PAID["total_spend"],
            "total_revenue": MOCK_MONTHLY_PAID["total_revenue"],
            "profit": round(MOCK_MONTHLY_PAID["total_revenue"] - MOCK_MONTHLY_PAID["total_spend"], 2),
            "sentiment_score": MOCK_MONTHLY_SENTIMENT["nps_estimate"],
        },
        "organic": MOCK_MONTHLY_ORGANIC,
        "paid": MOCK_MONTHLY_PAID,
        "sentiment": MOCK_MONTHLY_SENTIMENT,
        "market_position": MOCK_MARKET_POSITION,
        "generated_at": now.isoformat(),
        "format": "pdf_ready",
    }


# ---------------------------------------------------------------------------
# Content plan generation
# ---------------------------------------------------------------------------

def _generate_next_month_content_plan() -> dict:
    """Generate a content plan for the next month using mock AI."""
    now = datetime.now(timezone.utc)
    next_month = now.month + 1 if now.month < 12 else 1
    next_year = now.year if now.month < 12 else now.year + 1
    days_in_next = monthrange(next_year, next_month)[1]
    weeks = (days_in_next + 6) // 7

    logger.info(
        "Generating content plan for %d-%02d (%d days, ~%d weeks)",
        next_year, next_month, days_in_next, weeks,
    )

    # Generate weekly content slots
    weekly_plans = []
    for week_num in range(1, weeks + 1):
        week_start = datetime(next_year, next_month, min((week_num - 1) * 7 + 1, days_in_next), tzinfo=timezone.utc)

        posts = []
        for slot in range(CONTENT_POSTS_PER_WEEK):
            category = random.choice(CONTENT_CATEGORIES)
            platform = random.choice(PLATFORMS)
            post_type = random.choice(["image_post", "video_post", "carousel_post", "story", "reel"])
            day_offset = slot % 7
            hour = random.choice([9, 12, 15, 18, 19, 20, 21])

            posts.append({
                "slot_id": f"plan_{next_month:02d}_w{week_num}_s{slot+1:02d}",
                "category": category,
                "platform": platform,
                "type": post_type,
                "suggested_day": (week_start + timedelta(days=day_offset)).strftime("%A"),
                "suggested_time": f"{hour:02d}:00",
                "title_suggestion": f"[{category.upper()}] Week {week_num} - Slot {slot+1}",
                "status": "draft",
                "priority": random.choice(["low", "medium", "high"]),
            })

        weekly_plans.append({
            "week": week_num,
            "week_start": week_start.strftime("%Y-%m-%d"),
            "total_posts": len(posts),
            "posts": posts,
            "category_mix": {
                cat: sum(1 for p in posts if p["category"] == cat)
                for cat in CONTENT_CATEGORIES
            },
        })

    # Content themes for the month
    themes = [
        {"theme": "UCL Campaign Push", "priority": "high", "weeks": [1, 2]},
        {"theme": "Spring Merch Launch", "priority": "medium", "weeks": [2, 3]},
        {"theme": "Fan Appreciation Week", "priority": "high", "weeks": [3]},
        {"theme": "Academy Showcase", "priority": "low", "weeks": [4]},
        {"theme": "End-of-Season Countdown", "priority": "medium", "weeks": [3, 4]},
    ]

    return {
        "plan_month": next_month,
        "plan_year": next_year,
        "total_weeks": weeks,
        "total_posts_planned": sum(len(w["posts"]) for w in weekly_plans),
        "themes": themes,
        "weekly_plans": weekly_plans,
        "platform_distribution": {
            platform: sum(
                1 for w in weekly_plans for p in w["posts"] if p["platform"] == platform
            )
            for platform in PLATFORMS
        },
        "category_distribution": {
            cat: sum(
                1 for w in weekly_plans for p in w["posts"] if p["category"] == cat
            )
            for cat in CONTENT_CATEGORIES
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ai_model": "claude-opus-4-6-mock",
    }


# ---------------------------------------------------------------------------
# Market score update
# ---------------------------------------------------------------------------

def _update_market_scores() -> dict:
    """Update market position scores based on monthly data."""
    scores = {
        "engagement_index": round(random.uniform(1.5, 2.5), 2),
        "follower_share_pct": round(random.uniform(35.0, 45.0), 1),
        "brand_mention_share": round(random.uniform(38.0, 48.0), 1),
        "sentiment_advantage": round(random.uniform(5.0, 15.0), 1),
        "content_quality_score": round(random.uniform(7.0, 9.5), 1),
        "ad_efficiency_score": round(random.uniform(6.5, 9.0), 1),
        "overall_market_score": 0.0,
    }

    # Calculate overall composite score (weighted average)
    weights = {
        "engagement_index": 0.25,
        "follower_share_pct": 0.15,
        "brand_mention_share": 0.20,
        "sentiment_advantage": 0.15,
        "content_quality_score": 0.15,
        "ad_efficiency_score": 0.10,
    }

    # Normalize scores to 0-10 scale for composite
    normalized = {
        "engagement_index": min(scores["engagement_index"] / 3.0 * 10, 10),
        "follower_share_pct": min(scores["follower_share_pct"] / 50.0 * 10, 10),
        "brand_mention_share": min(scores["brand_mention_share"] / 50.0 * 10, 10),
        "sentiment_advantage": min(scores["sentiment_advantage"] / 20.0 * 10, 10),
        "content_quality_score": scores["content_quality_score"],
        "ad_efficiency_score": scores["ad_efficiency_score"],
    }

    scores["overall_market_score"] = round(
        sum(normalized[k] * weights[k] for k in weights), 2
    )

    scores["league_rank"] = 1
    scores["regional_rank"] = random.randint(2, 4)
    scores["updated_at"] = datetime.now(timezone.utc).isoformat()

    return scores


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.run_monthly_cycle",
    max_retries=3,
    default_retry_delay=600,
    acks_late=True,
)
def run_monthly_cycle(self):
    """
    Run the full monthly marketing cycle.

    1. Generate monthly performance report (PDF-ready data)
    2. Create next month's content plan
    3. Update market position scores

    Runs on the 1st of every month at 06:00 via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Monthly Cycle started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "monthly_report_generated": False,
        "content_plan_generated": False,
        "market_scores_updated": False,
        "monthly_report": None,
        "content_plan_summary": None,
        "market_scores": None,
        "errors": [],
    }

    try:
        # ------------------------------------------------------------------
        # Phase 1: Monthly Report
        # ------------------------------------------------------------------
        logger.info("--- Phase 1: Monthly Report Generation ---")
        try:
            report = _generate_monthly_report()
            results["monthly_report"] = report
            results["monthly_report_generated"] = True

            summary = report["executive_summary"]
            logger.info("Monthly report generated for %s-%02d",
                         report["period"]["year"], report["period"]["month"])
            logger.info("  Headline: %s", summary["headline"])
            logger.info("  Total reach: %s", f"{summary['total_reach']:,}")
            logger.info("  Total spend: EUR%.2f", summary["total_spend"])
            logger.info("  Total revenue: EUR%.2f", summary["total_revenue"])
            logger.info("  Profit: EUR%.2f", summary["profit"])
            logger.info("  NPS estimate: %d", summary["sentiment_score"])

            # In production: generate actual PDF
            # pdf_bytes = render_pdf_template("monthly_report.html", report)
            # s3.upload("reports/monthly_{period}.pdf", pdf_bytes)
            logger.info("  PDF generation: simulated (would upload to S3)")

        except Exception as exc:
            results["errors"].append({"phase": "monthly_report", "error": str(exc)})
            logger.error("Monthly report generation failed: %s", exc)

        # ------------------------------------------------------------------
        # Phase 2: Next Month Content Plan
        # ------------------------------------------------------------------
        logger.info("--- Phase 2: Next Month Content Plan ---")
        try:
            content_plan = _generate_next_month_content_plan()
            results["content_plan_generated"] = True
            results["content_plan_summary"] = {
                "month": content_plan["plan_month"],
                "year": content_plan["plan_year"],
                "total_posts": content_plan["total_posts_planned"],
                "weeks": content_plan["total_weeks"],
                "themes": [t["theme"] for t in content_plan["themes"]],
                "platform_distribution": content_plan["platform_distribution"],
            }

            logger.info("Content plan generated for %d-%02d",
                         content_plan["plan_year"], content_plan["plan_month"])
            logger.info("  Total posts planned: %d", content_plan["total_posts_planned"])
            logger.info("  Weeks covered: %d", content_plan["total_weeks"])
            logger.info("  Themes: %s", ", ".join(t["theme"] for t in content_plan["themes"]))
            logger.info("  Platform distribution: %s", content_plan["platform_distribution"])
            logger.info("  Category distribution: %s", content_plan["category_distribution"])

            # In production: insert plan into content_calendar table
            # for week in content_plan["weekly_plans"]:
            #     for post in week["posts"]:
            #         db.execute(insert(ContentSlot).values(**post))

        except Exception as exc:
            results["errors"].append({"phase": "content_plan", "error": str(exc)})
            logger.error("Content plan generation failed: %s", exc)

        # ------------------------------------------------------------------
        # Phase 3: Market Score Update
        # ------------------------------------------------------------------
        logger.info("--- Phase 3: Market Score Update ---")
        try:
            scores = _update_market_scores()
            results["market_scores"] = scores
            results["market_scores_updated"] = True

            logger.info("Market scores updated:")
            logger.info("  Engagement index: %.2f", scores["engagement_index"])
            logger.info("  Follower share: %.1f%%", scores["follower_share_pct"])
            logger.info("  Brand mention share: %.1f%%", scores["brand_mention_share"])
            logger.info("  Sentiment advantage: +%.1f pts", scores["sentiment_advantage"])
            logger.info("  Content quality: %.1f/10", scores["content_quality_score"])
            logger.info("  Ad efficiency: %.1f/10", scores["ad_efficiency_score"])
            logger.info("  Overall market score: %.2f/10", scores["overall_market_score"])
            logger.info("  League rank: #%d | Regional rank: #%d",
                         scores["league_rank"], scores["regional_rank"])

            # In production: update market_scores table
            # db.execute(
            #     update(MarketScore)
            #     .where(MarketScore.club == "dinamo_zagreb")
            #     .values(**scores)
            # )

        except Exception as exc:
            results["errors"].append({"phase": "market_scores", "error": str(exc)})
            logger.error("Market score update failed: %s", exc)

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        phases_ok = sum([
            results["monthly_report_generated"],
            results["content_plan_generated"],
            results["market_scores_updated"],
        ])

        logger.info("=== Monthly Cycle Complete ===")
        logger.info("  Phases completed: %d/3", phases_ok)
        logger.info("  Report: %s", "OK" if results["monthly_report_generated"] else "FAILED")
        logger.info("  Content plan: %s", "OK" if results["content_plan_generated"] else "FAILED")
        logger.info("  Market scores: %s", "OK" if results["market_scores_updated"] else "FAILED")

        if results["errors"]:
            logger.warning("  Errors: %d", len(results["errors"]))

        return results

    except Exception as exc:
        logger.exception("Monthly cycle crashed: %s", exc)
        raise self.retry(exc=exc)
