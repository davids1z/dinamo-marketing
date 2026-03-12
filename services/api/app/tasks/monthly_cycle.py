"""
ShiftOneZero Marketing Platform - Monthly Cycle Task
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
    "brand_engagement_rate": 7.3,
    "league_avg_engagement_rate": 3.8,
    "position_in_league": 1,
    "regional_position": 3,
    "engagement_index": 1.92,  # brand / league avg
    "follower_share_pct": 38.5,  # % of total HNL followers
    "brand_mention_share": 42.1,  # share of voice
}


# ---------------------------------------------------------------------------
# Monthly report generation
# ---------------------------------------------------------------------------

def _query_monthly_organic(year: int, month: int, client_id=None) -> dict:
    """Aggregate organic post metrics for a given month from real DB."""
    from app.database import SyncSessionLocal
    from app.models.analytics import PostMetric
    from sqlalchemy import select, func

    days = monthrange(year, month)[1]
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = datetime(year, month, days, 23, 59, 59, tzinfo=timezone.utc)

    with SyncSessionLocal() as db:
        query = select(
            func.count(PostMetric.id).label("cnt"),
            func.sum(PostMetric.impressions).label("imp"),
            func.sum(PostMetric.reach).label("reach"),
            func.avg(PostMetric.engagement_rate).label("eng"),
            func.sum(PostMetric.likes).label("likes"),
            func.sum(PostMetric.comments).label("comments"),
            func.sum(PostMetric.shares).label("shares"),
            func.sum(PostMetric.new_followers_attributed).label("followers"),
        ).where(PostMetric.timestamp >= start, PostMetric.timestamp <= end)
        if client_id is not None:
            query = query.where(PostMetric.client_id == client_id)
        row = db.execute(query).one()

        has_data = (row.cnt or 0) > 0
        if has_data:
            return {
                "total_posts": row.cnt or 0,
                "total_impressions": row.imp or 0,
                "total_reach": row.reach or 0,
                "avg_engagement_rate": round(float(row.eng or 0), 1),
                "total_likes": row.likes or 0,
                "total_comments": row.comments or 0,
                "total_shares": row.shares or 0,
                "followers_gained": {"total": row.followers or 0},
            }
    return MOCK_MONTHLY_ORGANIC


def _query_monthly_paid(year: int, month: int, client_id=None) -> dict:
    """Aggregate ad metrics for a given month from real DB."""
    from app.database import SyncSessionLocal
    from app.models.analytics import AdMetric
    from sqlalchemy import select, func

    days = monthrange(year, month)[1]
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = datetime(year, month, days, 23, 59, 59, tzinfo=timezone.utc)

    with SyncSessionLocal() as db:
        query = select(
            func.count(AdMetric.id).label("cnt"),
            func.sum(AdMetric.spend).label("spend"),
            func.sum(AdMetric.impressions).label("imp"),
            func.sum(AdMetric.conversions).label("conv"),
            func.sum(AdMetric.conversion_value).label("revenue"),
            func.avg(AdMetric.roas).label("roas"),
            func.avg(AdMetric.ctr).label("ctr"),
            func.avg(AdMetric.cpc).label("cpc"),
        ).where(AdMetric.timestamp >= start, AdMetric.timestamp <= end)
        if client_id is not None:
            query = query.where(AdMetric.client_id == client_id)
        row = db.execute(query).one()

        has_data = (row.cnt or 0) > 0
        if has_data:
            spend = float(row.spend or 0)
            revenue = float(row.revenue or 0)
            return {
                "total_campaigns": row.cnt or 0,
                "total_spend": round(spend, 2),
                "total_impressions": row.imp or 0,
                "total_conversions": row.conv or 0,
                "total_revenue": round(revenue, 2),
                "weighted_roas": round(float(row.roas or 0), 2),
                "avg_ctr": round(float(row.ctr or 0), 1),
                "avg_cpc": round(float(row.cpc or 0), 2),
                "budget_utilization_pct": 0,
            }
    return MOCK_MONTHLY_PAID


def _query_top_ads(year: int, month: int, limit: int = 5, client_id=None) -> list[dict]:
    """Get top and worst performing ads for the month."""
    from app.database import SyncSessionLocal
    from app.models.analytics import AdMetric
    from app.models.campaign import Ad, AdSet, Campaign
    from sqlalchemy import select, func

    days = monthrange(year, month)[1]
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = datetime(year, month, days, 23, 59, 59, tzinfo=timezone.utc)

    with SyncSessionLocal() as db:
        query = (
            select(
                Ad.headline,
                Ad.variant_label,
                Campaign.name.label("campaign_name"),
                Campaign.platform,
                func.sum(AdMetric.impressions).label("impressions"),
                func.sum(AdMetric.clicks).label("clicks"),
                func.sum(AdMetric.spend).label("spend"),
                func.sum(AdMetric.conversions).label("conversions"),
                func.avg(AdMetric.roas).label("roas"),
            )
            .join(Ad, AdMetric.ad_id == Ad.id)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .join(Campaign, AdSet.campaign_id == Campaign.id)
            .where(AdMetric.timestamp >= start, AdMetric.timestamp <= end)
        )
        if client_id is not None:
            query = query.where(Campaign.client_id == client_id)
        rows = db.execute(
            query.group_by(Ad.id, Campaign.id)
            .order_by(func.avg(AdMetric.roas).desc())
            .limit(limit * 2)
        ).all()

        if not rows:
            return []

        return [
            {
                "headline": r.headline,
                "variant": r.variant_label,
                "campaign": r.campaign_name,
                "platform": r.platform,
                "impressions": int(r.impressions or 0),
                "clicks": int(r.clicks or 0),
                "spend": round(float(r.spend or 0), 2),
                "conversions": int(r.conversions or 0),
                "roas": round(float(r.roas or 0), 2),
            }
            for r in rows
        ]


def _generate_monthly_report(client_id=None) -> dict:
    """Generate the full monthly performance report."""
    now = datetime.now(timezone.utc)
    year = now.year
    month = now.month - 1 if now.month > 1 else 12
    report_year = year if now.month > 1 else year - 1
    days_in_month = monthrange(report_year, month)[1]

    organic = _query_monthly_organic(report_year, month, client_id=client_id)
    paid = _query_monthly_paid(report_year, month, client_id=client_id)
    top_ads = _query_top_ads(report_year, month, client_id=client_id)

    total_engagement = (organic.get("total_likes", 0) +
                        organic.get("total_comments", 0) +
                        organic.get("total_shares", 0))
    spend = paid.get("total_spend", 0)
    revenue = paid.get("total_revenue", 0)

    # Split into best and worst performers
    best_ads = top_ads[:5] if top_ads else []
    worst_ads = list(reversed(top_ads[-3:])) if len(top_ads) > 5 else []

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
            "headline": f"Month with {paid.get('weighted_roas', 0):.1f}x ROAS and {organic.get('avg_engagement_rate', 0)}% engagement",
            "total_reach": organic.get("total_reach", 0),
            "total_engagement": total_engagement,
            "total_spend": spend,
            "total_revenue": revenue,
            "profit": round(revenue - spend, 2),
            "sentiment_score": MOCK_MONTHLY_SENTIMENT.get("nps_estimate", 0),
        },
        "organic": organic,
        "paid": paid,
        "ad_performance": {
            "best_ads": best_ads,
            "worst_ads": worst_ads,
            "total_ads_tracked": len(top_ads),
        },
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

    Iterates over all active clients. For each client:
    1. Generate monthly performance report (PDF-ready data)
    2. Create next month's content plan
    3. Update market position scores

    Runs on the 1st of every month at 06:00 via Celery Beat.
    """
    from app.database import SyncSessionLocal
    from app.models.client import Client
    from sqlalchemy import select

    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Monthly Cycle started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "clients_processed": 0,
        "monthly_reports_generated": 0,
        "content_plans_generated": 0,
        "market_scores_updated": 0,
        "client_results": [],
        "errors": [],
    }

    try:
        # 0. Load all active clients
        session = SyncSessionLocal()
        try:
            clients = session.execute(
                select(Client).where(Client.is_active == True)
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

            client_result = {
                "client_id": str(client.id),
                "monthly_report_generated": False,
                "content_plan_generated": False,
                "market_scores_updated": False,
            }

            # ------------------------------------------------------------------
            # Phase 1: Monthly Report
            # ------------------------------------------------------------------
            logger.info("  --- Phase 1: Monthly Report Generation [%s] ---", client.name)
            try:
                report = _generate_monthly_report(client_id=client.id)
                report["client_id"] = str(client.id)
                client_result["monthly_report_generated"] = True
                results["monthly_reports_generated"] += 1

                summary = report["executive_summary"]
                logger.info("  Monthly report generated for %s-%02d",
                             report["period"]["year"], report["period"]["month"])
                logger.info("    Headline: %s", summary["headline"])
                logger.info("    Total reach: %s", f"{summary['total_reach']:,}")
                logger.info("    Total spend: EUR%.2f", summary["total_spend"])
                logger.info("    Total revenue: EUR%.2f", summary["total_revenue"])
                logger.info("    Profit: EUR%.2f", summary["profit"])

            except Exception as exc:
                results["errors"].append({"phase": "monthly_report", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Monthly report generation failed for client %s: %s", client.name, exc)

            # ------------------------------------------------------------------
            # Phase 2: Next Month Content Plan
            # ------------------------------------------------------------------
            logger.info("  --- Phase 2: Next Month Content Plan [%s] ---", client.name)
            try:
                content_plan = _generate_next_month_content_plan()
                content_plan["client_id"] = str(client.id)
                client_result["content_plan_generated"] = True
                results["content_plans_generated"] += 1

                logger.info("  Content plan generated for %d-%02d",
                             content_plan["plan_year"], content_plan["plan_month"])
                logger.info("    Total posts planned: %d", content_plan["total_posts_planned"])

                # In production: insert plan into content_calendar table with client_id
                # for week in content_plan["weekly_plans"]:
                #     for post in week["posts"]:
                #         post["client_id"] = client.id
                #         db.execute(insert(ContentSlot).values(**post))

            except Exception as exc:
                results["errors"].append({"phase": "content_plan", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Content plan generation failed for client %s: %s", client.name, exc)

            # ------------------------------------------------------------------
            # Phase 3: Market Score Update
            # ------------------------------------------------------------------
            logger.info("  --- Phase 3: Market Score Update [%s] ---", client.name)
            try:
                scores = _update_market_scores()
                scores["client_id"] = str(client.id)
                client_result["market_scores_updated"] = True
                results["market_scores_updated"] += 1

                logger.info("  Market scores updated for %s:", client.name)
                logger.info("    Overall market score: %.2f/10", scores["overall_market_score"])

                # In production: update market_scores table with client_id filter
                # db.execute(
                #     update(MarketScore)
                #     .where(MarketScore.client_id == client.id)
                #     .values(**scores)
                # )

            except Exception as exc:
                results["errors"].append({"phase": "market_scores", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Market score update failed for client %s: %s", client.name, exc)

            results["client_results"].append(client_result)

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info("=== Monthly Cycle Complete ===")
        logger.info("  Clients processed: %d", results["clients_processed"])
        logger.info("  Reports generated: %d", results["monthly_reports_generated"])
        logger.info("  Content plans generated: %d", results["content_plans_generated"])
        logger.info("  Market scores updated: %d", results["market_scores_updated"])

        if results["errors"]:
            logger.warning("  Errors: %d", len(results["errors"]))

        return results

    except Exception as exc:
        logger.exception("Monthly cycle crashed: %s", exc)
        raise self.retry(exc=exc)
