"""
Dinamo Marketing Platform - Champions League Surge Check Task
Monitors the Champions League schedule. When a match is within 7 days,
activates "surge mode" -- increasing posting frequency and boosting ad budgets
to capitalize on heightened fan engagement.
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SURGE_WINDOW_DAYS = 7  # Activate surge when match is within 7 days
POST_FREQUENCY_MULTIPLIER = 2.0  # Double posting frequency during surge
AD_BUDGET_BOOST_PCT = 50  # Boost ad budgets by 50%
SURGE_HASHTAGS = ["#UCL", "#ChampionsLeague", "#DinamoUCL", "#GNKD"]

# ---------------------------------------------------------------------------
# Mock Champions League schedule (2025/26 season)
# ---------------------------------------------------------------------------

MOCK_CL_SCHEDULE = [
    {
        "match_id": "ucl_2526_md1",
        "competition": "UEFA Champions League",
        "phase": "League Phase",
        "matchday": 1,
        "home_team": "GNK Dinamo Zagreb",
        "away_team": "Bayern Munchen",
        "venue": "Stadion Maksimir",
        "kickoff": "2026-03-10T21:00:00+01:00",
        "is_home": True,
        "broadcast": ["Arena Sport", "DAZN"],
    },
    {
        "match_id": "ucl_2526_md2",
        "competition": "UEFA Champions League",
        "phase": "League Phase",
        "matchday": 2,
        "home_team": "AC Milan",
        "away_team": "GNK Dinamo Zagreb",
        "venue": "San Siro",
        "kickoff": "2026-03-24T21:00:00+01:00",
        "is_home": False,
        "broadcast": ["Arena Sport", "DAZN"],
    },
    {
        "match_id": "ucl_2526_md3",
        "competition": "UEFA Champions League",
        "phase": "League Phase",
        "matchday": 3,
        "home_team": "GNK Dinamo Zagreb",
        "away_team": "Arsenal FC",
        "venue": "Stadion Maksimir",
        "kickoff": "2026-04-15T21:00:00+02:00",
        "is_home": True,
        "broadcast": ["Arena Sport", "DAZN"],
    },
    {
        "match_id": "ucl_2526_md4",
        "competition": "UEFA Champions League",
        "phase": "League Phase",
        "matchday": 4,
        "home_team": "Real Madrid",
        "away_team": "GNK Dinamo Zagreb",
        "venue": "Santiago Bernabeu",
        "kickoff": "2026-05-06T21:00:00+02:00",
        "is_home": False,
        "broadcast": ["Arena Sport", "DAZN"],
    },
]

# Mock current campaign and content settings
MOCK_CURRENT_SETTINGS = {
    "daily_posts_target": 4,
    "ad_campaigns": [
        {"campaign_id": "camp_301", "name": "Matchday Tickets", "daily_budget": 500.0, "status": "active"},
        {"campaign_id": "camp_ucl_tickets", "name": "UCL Ticket Sale", "daily_budget": 800.0, "status": "active"},
        {"campaign_id": "camp_401", "name": "Membership Drive", "daily_budget": 300.0, "status": "active"},
        {"campaign_id": "camp_601", "name": "Merch Spring Collection", "daily_budget": 250.0, "status": "active"},
    ],
    "surge_mode_active": False,
    "surge_match_id": None,
}


# ---------------------------------------------------------------------------
# Surge mode logic
# ---------------------------------------------------------------------------

def _find_upcoming_matches(schedule: list, window_days: int) -> list:
    """Find CL matches within the specified window."""
    now = datetime.now(timezone.utc)
    upcoming = []

    for match in schedule:
        kickoff = datetime.fromisoformat(match["kickoff"])
        if kickoff.tzinfo is None:
            kickoff = kickoff.replace(tzinfo=timezone.utc)

        days_until = (kickoff - now).total_seconds() / 86400

        if 0 < days_until <= window_days:
            match_info = {**match, "days_until": round(days_until, 1)}
            upcoming.append(match_info)

    upcoming.sort(key=lambda m: m["days_until"])
    return upcoming


def _generate_surge_content_plan(match: dict) -> list:
    """Generate a content plan for the surge period around a CL match."""
    opponent = match["away_team"] if match["is_home"] else match["home_team"]
    venue = match["venue"]
    is_home = match["is_home"]

    kickoff = datetime.fromisoformat(match["kickoff"])
    if kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)

    plan = []

    # Day -7: Announcement
    plan.append({
        "day_offset": -7,
        "scheduled_for": (kickoff - timedelta(days=7)).isoformat(),
        "type": "image_post",
        "platforms": ["facebook", "instagram", "twitter_x"],
        "title": f"UCL Countdown: 7 Days to {opponent}!",
        "description": f"Matchday countdown begins. {opponent} {'comes to Maksimir' if is_home else f'awaits us at {venue}'}.",
        "hashtags": SURGE_HASHTAGS,
        "priority": "high",
    })

    # Day -5: History piece
    plan.append({
        "day_offset": -5,
        "scheduled_for": (kickoff - timedelta(days=5)).isoformat(),
        "type": "video_post",
        "platforms": ["youtube", "tiktok", "instagram"],
        "title": f"Dinamo vs {opponent} -- Our UCL History",
        "description": f"A look back at our European battles against {opponent}.",
        "hashtags": SURGE_HASHTAGS + ["#UCLHistory"],
        "priority": "medium",
    })

    # Day -3: Player spotlight
    plan.append({
        "day_offset": -3,
        "scheduled_for": (kickoff - timedelta(days=3)).isoformat(),
        "type": "interview",
        "platforms": ["youtube", "facebook", "instagram"],
        "title": "Player Preview: Ready for the Big Stage",
        "description": "Exclusive interview ahead of the Champions League clash.",
        "hashtags": SURGE_HASHTAGS,
        "priority": "high",
    })

    # Day -1: Matchday minus one
    plan.append({
        "day_offset": -1,
        "scheduled_for": (kickoff - timedelta(days=1)).isoformat(),
        "type": "carousel_post",
        "platforms": ["facebook", "instagram", "twitter_x"],
        "title": f"Tomorrow! Dinamo {'vs' if is_home else '@'} {opponent}",
        "description": f"Matchday minus 1. {'Maksimir is ready.' if is_home else f'The Blues head to {venue}.'}",
        "hashtags": SURGE_HASHTAGS + ["#MatchdayMinus1"],
        "priority": "critical",
    })

    # Matchday: Pre-match, live, post-match
    plan.append({
        "day_offset": 0,
        "scheduled_for": (kickoff - timedelta(hours=4)).isoformat(),
        "type": "multi_post",
        "platforms": ["facebook", "instagram", "twitter_x", "tiktok"],
        "title": f"MATCHDAY! Dinamo {'vs' if is_home else '@'} {opponent}",
        "description": "Pre-match content series: lineup, warmup, stadium atmosphere.",
        "hashtags": SURGE_HASHTAGS + ["#Matchday", "#UCLMatchday"],
        "priority": "critical",
    })

    # Day +1: Highlights and reaction
    plan.append({
        "day_offset": 1,
        "scheduled_for": (kickoff + timedelta(days=1)).isoformat(),
        "type": "video_post",
        "platforms": ["youtube", "tiktok", "instagram"],
        "title": f"Match Recap: Dinamo {'vs' if is_home else '@'} {opponent}",
        "description": "Full highlights, best moments, and fan reactions.",
        "hashtags": SURGE_HASHTAGS + ["#Highlights"],
        "priority": "high",
    })

    return plan


def _calculate_budget_boosts(campaigns: list, boost_pct: int) -> list:
    """Calculate boosted budgets for all active campaigns during surge."""
    boosts = []
    for campaign in campaigns:
        if campaign["status"] != "active":
            continue

        old_budget = campaign["daily_budget"]
        new_budget = round(old_budget * (1 + boost_pct / 100), 2)
        boost_amount = round(new_budget - old_budget, 2)

        boosts.append({
            "campaign_id": campaign["campaign_id"],
            "campaign_name": campaign["name"],
            "old_budget": old_budget,
            "new_budget": new_budget,
            "boost_amount": boost_amount,
            "boost_pct": boost_pct,
        })

    return boosts


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.check_cl_schedule",
    max_retries=3,
    default_retry_delay=300,
    acks_late=True,
)
def check_cl_schedule(self):
    """
    Check the Champions League schedule for upcoming matches.

    If a match is within 7 days, activate surge mode:
    - Double posting frequency
    - Boost ad budgets by 50%
    - Generate surge content plan
    - Enable CL-specific hashtag sets

    Runs every 6 hours via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Champions League Surge Check started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "surge_active": False,
        "upcoming_matches": [],
        "nearest_match": None,
        "content_plan": [],
        "budget_boosts": [],
        "settings_changes": {},
        "errors": [],
    }

    try:
        # ------------------------------------------------------------------
        # 1. Check for upcoming CL matches
        # ------------------------------------------------------------------
        upcoming = _find_upcoming_matches(MOCK_CL_SCHEDULE, SURGE_WINDOW_DAYS)
        results["upcoming_matches"] = [
            {
                "match_id": m["match_id"],
                "opponent": m["away_team"] if m["is_home"] else m["home_team"],
                "venue": m["venue"],
                "kickoff": m["kickoff"],
                "days_until": m["days_until"],
                "is_home": m["is_home"],
            }
            for m in upcoming
        ]

        if not upcoming:
            logger.info("No CL matches within %d days. Surge mode not needed.", SURGE_WINDOW_DAYS)

            # Deactivate surge if it was active
            if MOCK_CURRENT_SETTINGS["surge_mode_active"]:
                logger.info("Deactivating surge mode -- no upcoming matches")
                results["settings_changes"]["surge_mode_active"] = False
                results["settings_changes"]["daily_posts_target"] = MOCK_CURRENT_SETTINGS["daily_posts_target"]
                # In production: reset budgets to original levels

            logger.info("=== CL Surge Check complete -- no action needed ===")
            return results

        # ------------------------------------------------------------------
        # 2. Activate surge mode
        # ------------------------------------------------------------------
        nearest = upcoming[0]
        results["nearest_match"] = results["upcoming_matches"][0]
        results["surge_active"] = True

        opponent = nearest["away_team"] if nearest["is_home"] else nearest["home_team"]
        logger.info(
            "CL MATCH DETECTED: Dinamo %s %s in %.1f days at %s",
            "vs" if nearest["is_home"] else "@",
            opponent,
            nearest["days_until"],
            nearest["venue"],
        )

        # ------------------------------------------------------------------
        # 3. Boost posting frequency
        # ------------------------------------------------------------------
        old_posts = MOCK_CURRENT_SETTINGS["daily_posts_target"]
        new_posts = int(old_posts * POST_FREQUENCY_MULTIPLIER)
        results["settings_changes"]["daily_posts_target"] = new_posts
        results["settings_changes"]["surge_mode_active"] = True
        results["settings_changes"]["surge_match_id"] = nearest["match_id"]
        results["settings_changes"]["surge_hashtags"] = SURGE_HASHTAGS
        logger.info(
            "SURGE: Posting frequency boosted %d -> %d posts/day (%.0fx)",
            old_posts, new_posts, POST_FREQUENCY_MULTIPLIER,
        )

        # ------------------------------------------------------------------
        # 4. Boost ad budgets
        # ------------------------------------------------------------------
        budget_boosts = _calculate_budget_boosts(
            MOCK_CURRENT_SETTINGS["ad_campaigns"],
            AD_BUDGET_BOOST_PCT,
        )
        results["budget_boosts"] = budget_boosts
        total_boost = sum(b["boost_amount"] for b in budget_boosts)

        for boost in budget_boosts:
            logger.info(
                "SURGE: Budget boost %s -- EUR%.2f -> EUR%.2f (+EUR%.2f, +%d%%)",
                boost["campaign_name"],
                boost["old_budget"],
                boost["new_budget"],
                boost["boost_amount"],
                boost["boost_pct"],
            )

        logger.info("SURGE: Total daily budget increase: +EUR%.2f", total_boost)

        # ------------------------------------------------------------------
        # 5. Generate surge content plan
        # ------------------------------------------------------------------
        content_plan = _generate_surge_content_plan(nearest)
        results["content_plan"] = content_plan

        logger.info("SURGE: Generated %d content pieces for the match week:", len(content_plan))
        for item in content_plan:
            logger.info(
                "  Day %+d: [%s] \"%s\" -> %s (priority=%s)",
                item["day_offset"],
                item["type"],
                item["title"],
                ", ".join(item["platforms"]),
                item["priority"],
            )

        # ------------------------------------------------------------------
        # 6. Additional surge actions
        # ------------------------------------------------------------------
        if nearest["is_home"]:
            results["settings_changes"]["enable_geo_targeting"] = True
            results["settings_changes"]["geo_target_radius_km"] = 50
            results["settings_changes"]["geo_target_center"] = "Zagreb, Croatia"
            logger.info("SURGE: Enabled geo-targeting for home match (50km radius around Zagreb)")

        if nearest["days_until"] <= 2:
            results["settings_changes"]["real_time_posting"] = True
            logger.info("SURGE: Enabled real-time posting mode (match within 48 hours)")

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info("=== CL Surge Check Complete ===")
        logger.info("  Surge active: %s", results["surge_active"])
        logger.info("  Nearest match: %s in %.1f days", opponent, nearest["days_until"])
        logger.info("  Content pieces planned: %d", len(results["content_plan"]))
        logger.info("  Budget boosts: %d campaigns, +EUR%.2f/day total", len(budget_boosts), total_boost)

        return results

    except Exception as exc:
        logger.exception("CL surge check crashed: %s", exc)
        raise self.retry(exc=exc)
