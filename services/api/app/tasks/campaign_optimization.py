"""
Dinamo Marketing Platform - Campaign Optimization Task
Implements the 5 core optimization rules that run automatically
to manage ad performance, budgets, and creative freshness.
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optimization rule thresholds
# ---------------------------------------------------------------------------

# Rule 1: A/B test winner detection
AB_CTR_WINNER_THRESHOLD = 0.30  # 30% higher CTR = winner
AB_MIN_HOURS = 48  # Minimum 48 hours of data

# Rule 2: Low CTR pause
LOW_CTR_THRESHOLD = 1.5  # Below 1.5% CTR
LOW_CTR_MIN_DAYS = 2  # Must be low for 2 consecutive days

# Rule 3: High ROAS scale
HIGH_ROAS_THRESHOLD = 4.0  # ROAS above 4x
BUDGET_SCALE_FACTOR = 1.25  # Scale budget by 25%

# Rule 4: Low engagement
ENGAGEMENT_DROP_THRESHOLD = 0.80  # Below 80% of previous month average

# Rule 5: Ad fatigue
FREQUENCY_FATIGUE_THRESHOLD = 4.0  # Frequency > 4 = fatigued

# ---------------------------------------------------------------------------
# Mock active campaigns and ads
# ---------------------------------------------------------------------------

MOCK_AB_TESTS = [
    {
        "test_id": "ab_001",
        "campaign_id": "camp_101",
        "variant_a": {"ad_id": "ad_101a", "name": "Season Ticket - Emotional", "ctr": 3.2, "impressions": 45000, "hours_running": 52},
        "variant_b": {"ad_id": "ad_101b", "name": "Season Ticket - Promo", "ctr": 2.1, "impressions": 44500, "hours_running": 52},
        "status": "running",
    },
    {
        "test_id": "ab_002",
        "campaign_id": "camp_102",
        "variant_a": {"ad_id": "ad_102a", "name": "Merch Drop - Video", "ctr": 4.5, "impressions": 38000, "hours_running": 50},
        "variant_b": {"ad_id": "ad_102b", "name": "Merch Drop - Carousel", "ctr": 4.3, "impressions": 37500, "hours_running": 50},
        "status": "running",
    },
    {
        "test_id": "ab_003",
        "campaign_id": "camp_105",
        "variant_a": {"ad_id": "ad_105a", "name": "UCL Hype - Countdown", "ctr": 5.1, "impressions": 20000, "hours_running": 30},
        "variant_b": {"ad_id": "ad_105b", "name": "UCL Hype - Highlights", "ctr": 2.8, "impressions": 19800, "hours_running": 30},
        "status": "running",
    },
]

MOCK_ACTIVE_ADS = [
    {"ad_id": "ad_201", "campaign_id": "camp_201", "name": "Fan Zone Event Promo", "platform": "meta", "status": "active", "ctr": 1.2, "ctr_history_2d": [1.1, 1.3], "roas": 2.1, "spend": 150.0, "budget": 200.0, "frequency": 2.3, "engagement_rate": 3.5, "prev_month_avg_engagement": 4.2},
    {"ad_id": "ad_202", "campaign_id": "camp_201", "name": "Fan Zone - Retarget", "platform": "meta", "status": "active", "ctr": 0.9, "ctr_history_2d": [0.8, 1.0], "roas": 1.5, "spend": 80.0, "budget": 100.0, "frequency": 3.1, "engagement_rate": 2.8, "prev_month_avg_engagement": 3.0},
    {"ad_id": "ad_301", "campaign_id": "camp_301", "name": "Matchday Tickets", "platform": "meta", "status": "active", "ctr": 3.8, "ctr_history_2d": [3.5, 4.1], "roas": 5.2, "spend": 400.0, "budget": 500.0, "frequency": 1.8, "engagement_rate": 6.1, "prev_month_avg_engagement": 5.5},
    {"ad_id": "ad_302", "campaign_id": "camp_301", "name": "Matchday - Last Chance", "platform": "meta", "status": "active", "ctr": 2.5, "ctr_history_2d": [2.3, 2.7], "roas": 4.8, "spend": 350.0, "budget": 400.0, "frequency": 4.5, "engagement_rate": 4.0, "prev_month_avg_engagement": 5.2},
    {"ad_id": "ad_401", "campaign_id": "camp_401", "name": "Membership Drive", "platform": "tiktok", "status": "active", "ctr": 1.1, "ctr_history_2d": [1.0, 1.2], "roas": 1.8, "spend": 200.0, "budget": 300.0, "frequency": 5.2, "engagement_rate": 2.0, "prev_month_avg_engagement": 3.5},
    {"ad_id": "ad_501", "campaign_id": "camp_501", "name": "Youth Academy Promo", "platform": "youtube", "status": "active", "ctr": 2.9, "ctr_history_2d": [2.8, 3.0], "roas": 3.2, "spend": 120.0, "budget": 150.0, "frequency": 1.5, "engagement_rate": 5.8, "prev_month_avg_engagement": 5.0},
]


# ---------------------------------------------------------------------------
# Optimization rule implementations
# ---------------------------------------------------------------------------

def _rule_1_ab_winner(ab_tests: list) -> list:
    """
    Rule 1: A/B Winner Detection
    If one variant has >30% higher CTR after 48 hours, declare winner
    and pause the loser.
    """
    actions = []
    for test in ab_tests:
        if test["status"] != "running":
            continue

        a = test["variant_a"]
        b = test["variant_b"]

        # Check minimum runtime
        if a["hours_running"] < AB_MIN_HOURS or b["hours_running"] < AB_MIN_HOURS:
            logger.info(
                "AB test %s: only %d/%d hours -- need %d, skipping",
                test["test_id"], a["hours_running"], b["hours_running"], AB_MIN_HOURS,
            )
            continue

        # Calculate CTR difference
        if b["ctr"] > 0:
            a_vs_b = (a["ctr"] - b["ctr"]) / b["ctr"]
        else:
            a_vs_b = 1.0

        if a["ctr"] > 0:
            b_vs_a = (b["ctr"] - a["ctr"]) / a["ctr"]
        else:
            b_vs_a = 1.0

        if a_vs_b >= AB_CTR_WINNER_THRESHOLD:
            actions.append({
                "rule": "R1_AB_WINNER",
                "test_id": test["test_id"],
                "winner": a["ad_id"],
                "winner_name": a["name"],
                "winner_ctr": a["ctr"],
                "loser": b["ad_id"],
                "loser_name": b["name"],
                "loser_ctr": b["ctr"],
                "ctr_diff_pct": round(a_vs_b * 100, 1),
                "action": f"PAUSE {b['ad_id']} -- winner is {a['ad_id']} (+{a_vs_b*100:.1f}% CTR)",
            })
        elif b_vs_a >= AB_CTR_WINNER_THRESHOLD:
            actions.append({
                "rule": "R1_AB_WINNER",
                "test_id": test["test_id"],
                "winner": b["ad_id"],
                "winner_name": b["name"],
                "winner_ctr": b["ctr"],
                "loser": a["ad_id"],
                "loser_name": a["name"],
                "loser_ctr": a["ctr"],
                "ctr_diff_pct": round(b_vs_a * 100, 1),
                "action": f"PAUSE {a['ad_id']} -- winner is {b['ad_id']} (+{b_vs_a*100:.1f}% CTR)",
            })
        else:
            logger.info(
                "AB test %s: no clear winner yet (A=%.2f%%, B=%.2f%%, diff=%.1f%%)",
                test["test_id"], a["ctr"], b["ctr"], abs(a_vs_b) * 100,
            )

    return actions


def _rule_2_low_ctr(ads: list) -> list:
    """
    Rule 2: Low CTR Pause
    If CTR < 1.5% for 2 consecutive days, pause the ad.
    """
    actions = []
    for ad in ads:
        if ad["status"] != "active":
            continue

        history = ad.get("ctr_history_2d", [])
        if len(history) >= LOW_CTR_MIN_DAYS and all(c < LOW_CTR_THRESHOLD for c in history):
            actions.append({
                "rule": "R2_LOW_CTR",
                "ad_id": ad["ad_id"],
                "ad_name": ad["name"],
                "platform": ad["platform"],
                "current_ctr": ad["ctr"],
                "ctr_history": history,
                "action": f"PAUSE {ad['ad_id']} -- CTR below {LOW_CTR_THRESHOLD}% for {LOW_CTR_MIN_DAYS} days ({history})",
            })

    return actions


def _rule_3_high_roas(ads: list) -> list:
    """
    Rule 3: High ROAS Budget Scaling
    If ROAS > 4x, increase daily budget by 25%.
    """
    actions = []
    for ad in ads:
        if ad["status"] != "active":
            continue

        if ad["roas"] > HIGH_ROAS_THRESHOLD:
            old_budget = ad["budget"]
            new_budget = round(old_budget * BUDGET_SCALE_FACTOR, 2)
            actions.append({
                "rule": "R3_HIGH_ROAS",
                "ad_id": ad["ad_id"],
                "ad_name": ad["name"],
                "platform": ad["platform"],
                "roas": ad["roas"],
                "old_budget": old_budget,
                "new_budget": new_budget,
                "increase_pct": round((BUDGET_SCALE_FACTOR - 1) * 100),
                "action": f"SCALE {ad['ad_id']} budget EUR{old_budget} -> EUR{new_budget} (ROAS={ad['roas']}x)",
            })

    return actions


def _rule_4_low_engagement(ads: list) -> list:
    """
    Rule 4: Low Engagement Alert
    If engagement rate is below previous month average, flag for review.
    """
    actions = []
    for ad in ads:
        if ad["status"] != "active":
            continue

        prev_avg = ad.get("prev_month_avg_engagement", 0)
        if prev_avg <= 0:
            continue

        threshold = prev_avg * ENGAGEMENT_DROP_THRESHOLD
        if ad["engagement_rate"] < threshold:
            drop_pct = round((1 - ad["engagement_rate"] / prev_avg) * 100, 1)
            actions.append({
                "rule": "R4_LOW_ENGAGEMENT",
                "ad_id": ad["ad_id"],
                "ad_name": ad["name"],
                "platform": ad["platform"],
                "engagement_rate": ad["engagement_rate"],
                "prev_month_avg": prev_avg,
                "drop_pct": drop_pct,
                "action": f"FLAG {ad['ad_id']} -- engagement {ad['engagement_rate']}% is {drop_pct}% below prev month avg ({prev_avg}%)",
            })

    return actions


def _rule_5_ad_fatigue(ads: list) -> list:
    """
    Rule 5: Ad Fatigue Detection
    If frequency > 4, flag for creative refresh.
    """
    actions = []
    for ad in ads:
        if ad["status"] != "active":
            continue

        if ad["frequency"] > FREQUENCY_FATIGUE_THRESHOLD:
            actions.append({
                "rule": "R5_AD_FATIGUE",
                "ad_id": ad["ad_id"],
                "ad_name": ad["name"],
                "platform": ad["platform"],
                "frequency": ad["frequency"],
                "action": f"REFRESH {ad['ad_id']} -- frequency={ad['frequency']} exceeds {FREQUENCY_FATIGUE_THRESHOLD} threshold",
            })

    return actions


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.run_optimization_cycle",
    max_retries=3,
    default_retry_delay=120,
    acks_late=True,
)
def run_optimization_cycle(self):
    """
    Run the full 5-rule campaign optimization cycle.

    Evaluates all active ads and A/B tests against the optimization rules
    and takes automatic actions (pause, scale, flag, refresh).
    Runs every hour via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Campaign Optimization Cycle started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "rules_evaluated": 5,
        "ads_evaluated": len(MOCK_ACTIVE_ADS),
        "ab_tests_evaluated": len(MOCK_AB_TESTS),
        "actions_taken": [],
        "summary": {
            "R1_AB_WINNER": 0,
            "R2_LOW_CTR": 0,
            "R3_HIGH_ROAS": 0,
            "R4_LOW_ENGAGEMENT": 0,
            "R5_AD_FATIGUE": 0,
        },
        "total_budget_change": 0.0,
        "ads_paused": 0,
        "ads_flagged": 0,
        "errors": [],
    }

    try:
        # ------------------------------------------------------------------
        # Rule 1: A/B Winner Detection
        # ------------------------------------------------------------------
        logger.info("--- Rule 1: A/B Winner Detection ---")
        try:
            r1_actions = _rule_1_ab_winner(MOCK_AB_TESTS)
            for action in r1_actions:
                logger.info("  R1 ACTION: %s", action["action"])
                results["actions_taken"].append(action)
                results["summary"]["R1_AB_WINNER"] += 1
                results["ads_paused"] += 1
            if not r1_actions:
                logger.info("  R1: No A/B winners detected this cycle")
        except Exception as exc:
            results["errors"].append({"rule": "R1", "error": str(exc)})
            logger.error("Rule 1 failed: %s", exc)

        # ------------------------------------------------------------------
        # Rule 2: Low CTR Pause
        # ------------------------------------------------------------------
        logger.info("--- Rule 2: Low CTR Pause ---")
        try:
            r2_actions = _rule_2_low_ctr(MOCK_ACTIVE_ADS)
            for action in r2_actions:
                logger.info("  R2 ACTION: %s", action["action"])
                results["actions_taken"].append(action)
                results["summary"]["R2_LOW_CTR"] += 1
                results["ads_paused"] += 1
            if not r2_actions:
                logger.info("  R2: No ads below CTR threshold")
        except Exception as exc:
            results["errors"].append({"rule": "R2", "error": str(exc)})
            logger.error("Rule 2 failed: %s", exc)

        # ------------------------------------------------------------------
        # Rule 3: High ROAS Scaling
        # ------------------------------------------------------------------
        logger.info("--- Rule 3: High ROAS Budget Scaling ---")
        try:
            r3_actions = _rule_3_high_roas(MOCK_ACTIVE_ADS)
            for action in r3_actions:
                logger.info("  R3 ACTION: %s", action["action"])
                results["actions_taken"].append(action)
                results["summary"]["R3_HIGH_ROAS"] += 1
                budget_increase = action["new_budget"] - action["old_budget"]
                results["total_budget_change"] += budget_increase
            if not r3_actions:
                logger.info("  R3: No ads with ROAS above threshold")
        except Exception as exc:
            results["errors"].append({"rule": "R3", "error": str(exc)})
            logger.error("Rule 3 failed: %s", exc)

        # ------------------------------------------------------------------
        # Rule 4: Low Engagement
        # ------------------------------------------------------------------
        logger.info("--- Rule 4: Low Engagement Detection ---")
        try:
            r4_actions = _rule_4_low_engagement(MOCK_ACTIVE_ADS)
            for action in r4_actions:
                logger.info("  R4 ACTION: %s", action["action"])
                results["actions_taken"].append(action)
                results["summary"]["R4_LOW_ENGAGEMENT"] += 1
                results["ads_flagged"] += 1
            if not r4_actions:
                logger.info("  R4: All ads meeting engagement thresholds")
        except Exception as exc:
            results["errors"].append({"rule": "R4", "error": str(exc)})
            logger.error("Rule 4 failed: %s", exc)

        # ------------------------------------------------------------------
        # Rule 5: Ad Fatigue
        # ------------------------------------------------------------------
        logger.info("--- Rule 5: Ad Fatigue Detection ---")
        try:
            r5_actions = _rule_5_ad_fatigue(MOCK_ACTIVE_ADS)
            for action in r5_actions:
                logger.info("  R5 ACTION: %s", action["action"])
                results["actions_taken"].append(action)
                results["summary"]["R5_AD_FATIGUE"] += 1
                results["ads_flagged"] += 1
            if not r5_actions:
                logger.info("  R5: No ad fatigue detected")
        except Exception as exc:
            results["errors"].append({"rule": "R5", "error": str(exc)})
            logger.error("Rule 5 failed: %s", exc)

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        total_actions = len(results["actions_taken"])
        logger.info("=== Optimization Cycle Complete ===")
        logger.info("  Ads evaluated: %d", results["ads_evaluated"])
        logger.info("  A/B tests evaluated: %d", results["ab_tests_evaluated"])
        logger.info("  Total actions: %d", total_actions)
        logger.info("  Actions by rule: %s", results["summary"])
        logger.info("  Ads paused: %d", results["ads_paused"])
        logger.info("  Ads flagged: %d", results["ads_flagged"])
        logger.info("  Total budget change: EUR%.2f", results["total_budget_change"])

        if results["errors"]:
            logger.warning("  Errors: %d rules had failures", len(results["errors"]))

        return results

    except Exception as exc:
        logger.exception("Optimization cycle crashed: %s", exc)
        raise self.retry(exc=exc)
