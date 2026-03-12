"""
ShiftOneZero Marketing Platform - Fan Lifecycle Task
Updates fan lifecycle stages based on recent activity, calculates
churn risk scores, and estimates Customer Lifetime Value (CLV).
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Lifecycle stages (ordered by progression)
LIFECYCLE_STAGES = [
    "prospect",       # Discovered the club online, no engagement yet
    "casual_fan",     # Occasional engagement (likes, views)
    "engaged_fan",    # Regular engagement, follows on multiple platforms
    "ticket_buyer",   # Has purchased at least one match ticket
    "season_holder",  # Holds a season ticket
    "member",         # Paid club membership
    "superfan",       # Member + merch buyer + high engagement
    "ambassador",     # Creates UGC, recruits other fans, high CLV
]

# Churn risk thresholds
CHURN_HIGH_THRESHOLD = 0.70
CHURN_MEDIUM_THRESHOLD = 0.40
DAYS_INACTIVE_HIGH_RISK = 60
DAYS_INACTIVE_MEDIUM_RISK = 30

# CLV calculation parameters
AVG_TICKET_PRICE = 15.00  # EUR
AVG_SEASON_TICKET = 180.00
AVG_MERCH_ORDER = 55.00
AVG_MEMBERSHIP_FEE = 120.00
RETENTION_RATE = 0.82
DISCOUNT_RATE = 0.10
CLV_HORIZON_YEARS = 5

# ---------------------------------------------------------------------------
# Mock fan database
# ---------------------------------------------------------------------------

MOCK_FANS = [
    {
        "fan_id": "fan_001",
        "name": "Marko K.",
        "email": "marko@example.com",
        "current_stage": "member",
        "joined_date": "2022-03-15",
        "last_activity": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        "activities_30d": {"likes": 45, "comments": 12, "shares": 8, "tickets_bought": 2, "merch_orders": 1, "ugc_posts": 0},
        "total_spend": 850.00,
        "platforms_followed": ["facebook", "instagram", "twitter_x", "tiktok"],
        "has_season_ticket": True,
        "has_membership": True,
        "match_attendance_rate": 0.85,
    },
    {
        "fan_id": "fan_002",
        "name": "Ana P.",
        "email": "ana@example.com",
        "current_stage": "superfan",
        "joined_date": "2020-09-01",
        "last_activity": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "activities_30d": {"likes": 120, "comments": 35, "shares": 22, "tickets_bought": 3, "merch_orders": 2, "ugc_posts": 5},
        "total_spend": 2_400.00,
        "platforms_followed": ["facebook", "instagram", "twitter_x", "tiktok", "youtube"],
        "has_season_ticket": True,
        "has_membership": True,
        "match_attendance_rate": 0.92,
    },
    {
        "fan_id": "fan_003",
        "name": "Ivan S.",
        "email": "ivan@example.com",
        "current_stage": "ticket_buyer",
        "joined_date": "2024-01-10",
        "last_activity": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
        "activities_30d": {"likes": 18, "comments": 3, "shares": 1, "tickets_bought": 1, "merch_orders": 0, "ugc_posts": 0},
        "total_spend": 120.00,
        "platforms_followed": ["instagram", "tiktok"],
        "has_season_ticket": False,
        "has_membership": False,
        "match_attendance_rate": 0.30,
    },
    {
        "fan_id": "fan_004",
        "name": "Petra M.",
        "email": "petra@example.com",
        "current_stage": "engaged_fan",
        "joined_date": "2024-06-20",
        "last_activity": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),
        "activities_30d": {"likes": 5, "comments": 0, "shares": 0, "tickets_bought": 0, "merch_orders": 0, "ugc_posts": 0},
        "total_spend": 55.00,
        "platforms_followed": ["instagram"],
        "has_season_ticket": False,
        "has_membership": False,
        "match_attendance_rate": 0.10,
    },
    {
        "fan_id": "fan_005",
        "name": "Nikola B.",
        "email": "nikola@example.com",
        "current_stage": "ambassador",
        "joined_date": "2019-05-01",
        "last_activity": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
        "activities_30d": {"likes": 200, "comments": 65, "shares": 40, "tickets_bought": 4, "merch_orders": 3, "ugc_posts": 12},
        "total_spend": 5_200.00,
        "platforms_followed": ["facebook", "instagram", "twitter_x", "tiktok", "youtube", "linkedin"],
        "has_season_ticket": True,
        "has_membership": True,
        "match_attendance_rate": 0.95,
    },
    {
        "fan_id": "fan_006",
        "name": "Luka T.",
        "email": "luka@example.com",
        "current_stage": "casual_fan",
        "joined_date": "2025-08-12",
        "last_activity": (datetime.now(timezone.utc) - timedelta(days=70)).isoformat(),
        "activities_30d": {"likes": 2, "comments": 0, "shares": 0, "tickets_bought": 0, "merch_orders": 0, "ugc_posts": 0},
        "total_spend": 0.00,
        "platforms_followed": ["tiktok"],
        "has_season_ticket": False,
        "has_membership": False,
        "match_attendance_rate": 0.0,
    },
    {
        "fan_id": "fan_007",
        "name": "Maja R.",
        "email": "maja@example.com",
        "current_stage": "prospect",
        "joined_date": "2026-02-01",
        "last_activity": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
        "activities_30d": {"likes": 8, "comments": 1, "shares": 0, "tickets_bought": 0, "merch_orders": 0, "ugc_posts": 0},
        "total_spend": 0.00,
        "platforms_followed": ["instagram"],
        "has_season_ticket": False,
        "has_membership": False,
        "match_attendance_rate": 0.0,
    },
    {
        "fan_id": "fan_008",
        "name": "Tomislav D.",
        "email": "tomislav@example.com",
        "current_stage": "season_holder",
        "joined_date": "2021-07-15",
        "last_activity": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
        "activities_30d": {"likes": 30, "comments": 8, "shares": 5, "tickets_bought": 0, "merch_orders": 1, "ugc_posts": 1},
        "total_spend": 1_650.00,
        "platforms_followed": ["facebook", "instagram", "twitter_x"],
        "has_season_ticket": True,
        "has_membership": False,
        "match_attendance_rate": 0.78,
    },
]


# ---------------------------------------------------------------------------
# Lifecycle stage determination
# ---------------------------------------------------------------------------

def _determine_lifecycle_stage(fan: dict) -> str:
    """Determine the correct lifecycle stage based on fan activity and attributes."""
    acts = fan["activities_30d"]

    total_engagement = acts["likes"] + acts["comments"] + acts["shares"]
    has_ugc = acts["ugc_posts"] > 0
    has_bought_tickets = acts["tickets_bought"] > 0 or fan["total_spend"] > 0
    platforms_count = len(fan["platforms_followed"])

    # Ambassador: member + high engagement + UGC creator
    if (fan["has_membership"] and fan["has_season_ticket"] and
            acts["ugc_posts"] >= 3 and total_engagement >= 100):
        return "ambassador"

    # Superfan: member + merch buyer + high engagement
    if (fan["has_membership"] and fan["has_season_ticket"] and
            acts["merch_orders"] >= 1 and total_engagement >= 50):
        return "superfan"

    # Member
    if fan["has_membership"]:
        return "member"

    # Season holder
    if fan["has_season_ticket"]:
        return "season_holder"

    # Ticket buyer
    if has_bought_tickets or fan["match_attendance_rate"] > 0.1:
        return "ticket_buyer"

    # Engaged fan: multi-platform + regular engagement
    if platforms_count >= 2 and total_engagement >= 15:
        return "engaged_fan"

    # Casual fan: some engagement
    if total_engagement >= 3:
        return "casual_fan"

    # Prospect
    return "prospect"


def _calculate_churn_score(fan: dict) -> dict:
    """Calculate churn risk score for a fan (0.0 to 1.0, higher = more risk)."""
    now = datetime.now(timezone.utc)
    last_activity = datetime.fromisoformat(fan["last_activity"])
    if last_activity.tzinfo is None:
        last_activity = last_activity.replace(tzinfo=timezone.utc)

    days_inactive = (now - last_activity).days
    acts = fan["activities_30d"]
    total_engagement = acts["likes"] + acts["comments"] + acts["shares"]

    # Base churn score from inactivity
    if days_inactive >= DAYS_INACTIVE_HIGH_RISK:
        inactivity_score = 0.85
    elif days_inactive >= DAYS_INACTIVE_MEDIUM_RISK:
        inactivity_score = 0.50
    elif days_inactive >= 14:
        inactivity_score = 0.25
    else:
        inactivity_score = 0.05

    # Engagement factor (low engagement increases churn risk)
    if total_engagement == 0:
        engagement_factor = 0.30
    elif total_engagement < 10:
        engagement_factor = 0.15
    elif total_engagement < 30:
        engagement_factor = 0.05
    else:
        engagement_factor = -0.10  # High engagement reduces risk

    # Monetary commitment reduces churn risk
    if fan["has_season_ticket"]:
        commitment_factor = -0.20
    elif fan["has_membership"]:
        commitment_factor = -0.15
    elif fan["total_spend"] > 100:
        commitment_factor = -0.05
    else:
        commitment_factor = 0.10

    # Platform diversity reduces risk
    platform_factor = max(-0.10, -0.02 * len(fan["platforms_followed"]))

    # Calculate final score
    raw_score = inactivity_score + engagement_factor + commitment_factor + platform_factor
    churn_score = max(0.0, min(1.0, raw_score))

    # Determine risk level
    if churn_score >= CHURN_HIGH_THRESHOLD:
        risk_level = "high"
    elif churn_score >= CHURN_MEDIUM_THRESHOLD:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "churn_score": round(churn_score, 3),
        "risk_level": risk_level,
        "days_inactive": days_inactive,
        "factors": {
            "inactivity": round(inactivity_score, 2),
            "engagement": round(engagement_factor, 2),
            "commitment": round(commitment_factor, 2),
            "platform_diversity": round(platform_factor, 2),
        },
    }


def _calculate_clv(fan: dict, churn_info: dict) -> dict:
    """Estimate Customer Lifetime Value for a fan."""
    # Estimate annual revenue based on current spending patterns
    annual_revenue_components = []

    if fan["has_season_ticket"]:
        annual_revenue_components.append(("season_ticket", AVG_SEASON_TICKET))
    elif fan["match_attendance_rate"] > 0:
        est_matches = fan["match_attendance_rate"] * 18  # 18 home matches/season
        annual_revenue_components.append(("match_tickets", round(est_matches * AVG_TICKET_PRICE, 2)))

    if fan["has_membership"]:
        annual_revenue_components.append(("membership", AVG_MEMBERSHIP_FEE))

    merch_per_month = fan["activities_30d"].get("merch_orders", 0)
    if merch_per_month > 0:
        annual_revenue_components.append(("merchandise", round(merch_per_month * AVG_MERCH_ORDER * 12, 2)))

    annual_revenue = sum(v for _, v in annual_revenue_components)

    # Simple DCF-based CLV calculation
    retention = 1 - (churn_info["churn_score"] * 0.3)  # Adjust retention by churn risk
    retention = max(0.5, min(0.98, retention))

    clv = 0.0
    for year in range(1, CLV_HORIZON_YEARS + 1):
        yearly_value = annual_revenue * (retention ** year) / ((1 + DISCOUNT_RATE) ** year)
        clv += yearly_value

    # Add historical spend
    total_clv = round(fan["total_spend"] + clv, 2)

    # Determine CLV tier
    if total_clv >= 3_000:
        tier = "platinum"
    elif total_clv >= 1_500:
        tier = "gold"
    elif total_clv >= 500:
        tier = "silver"
    else:
        tier = "bronze"

    return {
        "estimated_annual_revenue": round(annual_revenue, 2),
        "revenue_components": annual_revenue_components,
        "adjusted_retention_rate": round(retention, 3),
        "projected_clv": round(clv, 2),
        "historical_spend": fan["total_spend"],
        "total_clv": total_clv,
        "clv_tier": tier,
        "horizon_years": CLV_HORIZON_YEARS,
    }


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.update_fan_lifecycles",
    max_retries=3,
    default_retry_delay=120,
    acks_late=True,
)
def update_fan_lifecycles(self):
    """
    Update fan lifecycle stages, churn scores, and CLV estimates.

    Iterates over all active clients. For each client and each fan:
    1. Re-evaluate lifecycle stage based on recent activity
    2. Calculate churn risk score
    3. Estimate Customer Lifetime Value
    4. Generate alerts for high-churn-risk fans

    Runs daily at 05:00 via Celery Beat.
    """
    from app.database import SyncSessionLocal
    from app.models.client import Client
    from sqlalchemy import select

    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Fan Lifecycle Update started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "clients_processed": 0,
        "fans_processed": 0,
        "stage_changes": 0,
        "churn_alerts": 0,
        "stage_distribution": {stage: 0 for stage in LIFECYCLE_STAGES},
        "churn_distribution": {"low": 0, "medium": 0, "high": 0},
        "clv_distribution": {"bronze": 0, "silver": 0, "gold": 0, "platinum": 0},
        "total_portfolio_clv": 0.0,
        "avg_churn_score": 0.0,
        "stage_transitions": [],
        "high_churn_fans": [],
        "errors": [],
    }

    total_churn = 0.0

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

            # TODO: In production, query fans from DB filtered by client_id
            fans = MOCK_FANS

            for fan in fans:
                fan_id = fan["fan_id"]
                results["fans_processed"] += 1

                try:
                    # ----------------------------------------------------------
                    # 1. Determine lifecycle stage
                    # ----------------------------------------------------------
                    old_stage = fan["current_stage"]
                    new_stage = _determine_lifecycle_stage(fan)
                    old_idx = LIFECYCLE_STAGES.index(old_stage) if old_stage in LIFECYCLE_STAGES else 0
                    new_idx = LIFECYCLE_STAGES.index(new_stage)

                    results["stage_distribution"][new_stage] += 1

                    if old_stage != new_stage:
                        results["stage_changes"] += 1
                        direction = "UPGRADED" if new_idx > old_idx else "DOWNGRADED"
                        transition = {
                            "fan_id": fan_id,
                            "name": fan["name"],
                            "old_stage": old_stage,
                            "new_stage": new_stage,
                            "direction": direction,
                            "client_id": str(client.id),
                        }
                        results["stage_transitions"].append(transition)
                        logger.info(
                            "    %s %s: %s -> %s (%s)",
                            fan_id, fan["name"], old_stage, new_stage, direction,
                        )

                    # ----------------------------------------------------------
                    # 2. Calculate churn score
                    # ----------------------------------------------------------
                    churn_info = _calculate_churn_score(fan)
                    total_churn += churn_info["churn_score"]
                    results["churn_distribution"][churn_info["risk_level"]] += 1

                    if churn_info["risk_level"] == "high":
                        results["churn_alerts"] += 1
                        results["high_churn_fans"].append({
                            "fan_id": fan_id,
                            "name": fan["name"],
                            "stage": new_stage,
                            "churn_score": churn_info["churn_score"],
                            "days_inactive": churn_info["days_inactive"],
                            "email": fan["email"],
                            "client_id": str(client.id),
                        })
                        logger.warning(
                            "    HIGH CHURN RISK: %s (%s) -- score=%.2f, inactive=%d days",
                            fan["name"], fan_id, churn_info["churn_score"], churn_info["days_inactive"],
                        )

                    # ----------------------------------------------------------
                    # 3. Calculate CLV
                    # ----------------------------------------------------------
                    clv_info = _calculate_clv(fan, churn_info)
                    results["clv_distribution"][clv_info["clv_tier"]] += 1
                    results["total_portfolio_clv"] += clv_info["total_clv"]

                    logger.info(
                        "    %s [%s] -- stage=%s, churn=%.2f (%s), CLV=EUR%.2f (%s)",
                        fan["name"],
                        fan_id,
                        new_stage,
                        churn_info["churn_score"],
                        churn_info["risk_level"],
                        clv_info["total_clv"],
                        clv_info["clv_tier"],
                    )

                    # In production: update fan record in database
                    # db.execute(
                    #     update(Fan)
                    #     .where(Fan.id == fan_id)
                    #     .where(Fan.client_id == client.id)
                    #     .values(
                    #         lifecycle_stage=new_stage,
                    #         churn_score=churn_info["churn_score"],
                    #         churn_risk=churn_info["risk_level"],
                    #         clv=clv_info["total_clv"],
                    #         clv_tier=clv_info["clv_tier"],
                    #         updated_at=datetime.now(timezone.utc),
                    #     )
                    # )

                except Exception as exc:
                    results["errors"].append({"fan_id": fan_id, "client_id": str(client.id), "error": str(exc)})
                    logger.error("  Failed to process fan %s: %s", fan_id, exc)

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        results["avg_churn_score"] = round(
            total_churn / results["fans_processed"], 3
        ) if results["fans_processed"] > 0 else 0.0
        results["total_portfolio_clv"] = round(results["total_portfolio_clv"], 2)

        logger.info("=== Fan Lifecycle Update Complete ===")
        logger.info("  Clients processed: %d", results["clients_processed"])
        logger.info("  Fans processed: %d", results["fans_processed"])
        logger.info("  Stage changes: %d", results["stage_changes"])
        logger.info("  Stage distribution: %s", results["stage_distribution"])
        logger.info("")
        logger.info("  Churn distribution: %s", results["churn_distribution"])
        logger.info("  Avg churn score: %.3f", results["avg_churn_score"])
        logger.info("  High-risk fans: %d", results["churn_alerts"])
        logger.info("")
        logger.info("  CLV distribution: %s", results["clv_distribution"])
        logger.info("  Total portfolio CLV: EUR%.2f", results["total_portfolio_clv"])

        if results["stage_transitions"]:
            logger.info("  Stage transitions:")
            for t in results["stage_transitions"]:
                logger.info("    %s: %s -> %s (%s)", t["name"], t["old_stage"], t["new_stage"], t["direction"])

        if results["high_churn_fans"]:
            logger.warning("  Fans requiring retention action:")
            for f in results["high_churn_fans"]:
                logger.warning(
                    "    %s (%s) -- churn=%.2f, inactive=%d days, email=%s",
                    f["name"], f["stage"], f["churn_score"], f["days_inactive"], f["email"],
                )

        if results["errors"]:
            logger.warning("  Errors: %d", len(results["errors"]))

        return results

    except Exception as exc:
        logger.exception("Fan lifecycle update crashed: %s", exc)
        raise self.retry(exc=exc)
