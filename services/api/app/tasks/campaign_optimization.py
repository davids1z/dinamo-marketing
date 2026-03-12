"""
ShiftOneZero Marketing Platform - Campaign Optimization Task
Implements the 5 core optimization rules that run automatically
to manage ad performance, budgets, and creative freshness.
"""

import logging
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
# DB data fetchers
# ---------------------------------------------------------------------------

def _query_ab_tests(client_id=None):
    """Fetch running A/B tests with ad metrics from DB."""
    from app.database import SyncSessionLocal
    from app.models.analytics import AdMetric
    from app.models.campaign import ABTest, Ad, AdSet, Campaign
    from sqlalchemy import select, func

    now = datetime.now(timezone.utc)
    tests = []
    with SyncSessionLocal() as db:
        query = select(ABTest).where(ABTest.status == "running")
        if client_id is not None:
            query = query.where(ABTest.client_id == client_id)
        rows = db.execute(query).scalars().all()

        for ab in rows:
            hours_running = (now - ab.started_at).total_seconds() / 3600

            # Get ads for this test's campaign via AdSet
            ads = db.execute(
                select(Ad, AdSet)
                .join(AdSet, Ad.ad_set_id == AdSet.id)
                .where(AdSet.campaign_id == ab.campaign_id)
                .where(Ad.status.in_(["active", "winner", "loser"]))
                .order_by(Ad.variant_label)
            ).all()

            variants = []
            for ad, ad_set in ads:
                # Get latest metrics for this ad
                latest = db.execute(
                    select(AdMetric)
                    .where(AdMetric.ad_id == ad.id)
                    .order_by(AdMetric.timestamp.desc())
                    .limit(1)
                ).scalar_one_or_none()

                variants.append({
                    "ad_id": str(ad.id),
                    "name": ad.headline[:60],
                    "ctr": float(latest.ctr) if latest else 0.0,
                    "impressions": latest.impressions if latest else 0,
                    "hours_running": round(hours_running),
                })

            if len(variants) >= 2:
                tests.append({
                    "test_id": str(ab.id),
                    "campaign_id": str(ab.campaign_id),
                    "variant_a": variants[0],
                    "variant_b": variants[1],
                    "status": "running",
                })

    return tests


def _query_active_ads(client_id=None):
    """Fetch active ads with latest metrics from DB."""
    from app.database import SyncSessionLocal
    from app.models.analytics import AdMetric
    from app.models.campaign import Ad, AdSet, Campaign
    from sqlalchemy import select, func

    now = datetime.now(timezone.utc)
    prev_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
    prev_month_end = now.replace(day=1)
    result = []

    with SyncSessionLocal() as db:
        query = (
            select(Ad, AdSet, Campaign)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .join(Campaign, AdSet.campaign_id == Campaign.id)
            .where(Ad.status == "active")
        )
        if client_id is not None:
            query = query.where(Campaign.client_id == client_id)
        rows = db.execute(query).all()

        for ad, ad_set, campaign in rows:
            # Latest metric snapshot
            latest = db.execute(
                select(AdMetric)
                .where(AdMetric.ad_id == ad.id)
                .order_by(AdMetric.timestamp.desc())
                .limit(1)
            ).scalar_one_or_none()
            if not latest:
                continue

            # CTR history: last 2 daily snapshots
            two_days_ago = now - timedelta(days=2)
            history_rows = db.execute(
                select(AdMetric.ctr)
                .where(AdMetric.ad_id == ad.id)
                .where(AdMetric.timestamp >= two_days_ago)
                .order_by(AdMetric.timestamp)
            ).scalars().all()
            ctr_history = [round(float(c), 2) for c in history_rows[-2:]] if history_rows else []

            # Previous month avg engagement (using CTR as proxy)
            prev_avg_row = db.execute(
                select(func.avg(AdMetric.ctr))
                .where(AdMetric.ad_id == ad.id)
                .where(AdMetric.timestamp >= prev_month_start)
                .where(AdMetric.timestamp < prev_month_end)
            ).scalar()
            prev_avg = round(float(prev_avg_row), 2) if prev_avg_row else 0.0

            result.append({
                "ad_id": str(ad.id),
                "campaign_id": str(campaign.id),
                "name": ad.headline[:60],
                "platform": campaign.platform or "meta",
                "status": "active",
                "ctr": round(float(latest.ctr), 2),
                "ctr_history_2d": ctr_history,
                "roas": round(float(latest.roas), 2),
                "spend": round(float(latest.spend), 2),
                "budget": round(float(ad_set.budget), 2),
                "frequency": round(float(latest.frequency), 2),
                "engagement_rate": round(float(latest.ctr), 2),
                "prev_month_avg_engagement": prev_avg,
            })

    return result


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

    Iterates over all active clients. For each client, evaluates all
    active ads and A/B tests against the optimization rules and takes
    automatic actions (pause, scale, flag, refresh).
    Runs every hour via Celery Beat.
    """
    from app.database import SyncSessionLocal
    from app.models.client import Client
    from sqlalchemy import select

    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Campaign Optimization Cycle started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "clients_processed": 0,
        "rules_evaluated": 5,
        "ads_evaluated": 0,
        "ab_tests_evaluated": 0,
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

            # Fetch real data from DB for this client
            try:
                ab_tests = _query_ab_tests(client_id=client.id)
                logger.info("  Loaded %d running A/B tests for client %s", len(ab_tests), client.name)
            except Exception as exc:
                logger.warning("  Failed to query A/B tests for client %s: %s — using empty list", client.name, exc)
                ab_tests = []

            try:
                active_ads = _query_active_ads(client_id=client.id)
                logger.info("  Loaded %d active ads for client %s", len(active_ads), client.name)
            except Exception as exc:
                logger.warning("  Failed to query active ads for client %s: %s — using empty list", client.name, exc)
                active_ads = []

            results["ads_evaluated"] += len(active_ads)
            results["ab_tests_evaluated"] += len(ab_tests)

            # ------------------------------------------------------------------
            # Rule 1: A/B Winner Detection
            # ------------------------------------------------------------------
            logger.info("  --- Rule 1: A/B Winner Detection ---")
            try:
                r1_actions = _rule_1_ab_winner(ab_tests)
                for action in r1_actions:
                    action["client_id"] = str(client.id)
                    logger.info("    R1 ACTION: %s", action["action"])
                    results["actions_taken"].append(action)
                    results["summary"]["R1_AB_WINNER"] += 1
                    results["ads_paused"] += 1
                if not r1_actions:
                    logger.info("    R1: No A/B winners detected this cycle")
            except Exception as exc:
                results["errors"].append({"rule": "R1", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Rule 1 failed: %s", exc)

            # ------------------------------------------------------------------
            # Rule 2: Low CTR Pause
            # ------------------------------------------------------------------
            logger.info("  --- Rule 2: Low CTR Pause ---")
            try:
                r2_actions = _rule_2_low_ctr(active_ads)
                for action in r2_actions:
                    action["client_id"] = str(client.id)
                    logger.info("    R2 ACTION: %s", action["action"])
                    results["actions_taken"].append(action)
                    results["summary"]["R2_LOW_CTR"] += 1
                    results["ads_paused"] += 1
                if not r2_actions:
                    logger.info("    R2: No ads below CTR threshold")
            except Exception as exc:
                results["errors"].append({"rule": "R2", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Rule 2 failed: %s", exc)

            # ------------------------------------------------------------------
            # Rule 3: High ROAS Scaling
            # ------------------------------------------------------------------
            logger.info("  --- Rule 3: High ROAS Budget Scaling ---")
            try:
                r3_actions = _rule_3_high_roas(active_ads)
                for action in r3_actions:
                    action["client_id"] = str(client.id)
                    logger.info("    R3 ACTION: %s", action["action"])
                    results["actions_taken"].append(action)
                    results["summary"]["R3_HIGH_ROAS"] += 1
                    budget_increase = action["new_budget"] - action["old_budget"]
                    results["total_budget_change"] += budget_increase
                if not r3_actions:
                    logger.info("    R3: No ads with ROAS above threshold")
            except Exception as exc:
                results["errors"].append({"rule": "R3", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Rule 3 failed: %s", exc)

            # ------------------------------------------------------------------
            # Rule 4: Low Engagement
            # ------------------------------------------------------------------
            logger.info("  --- Rule 4: Low Engagement Detection ---")
            try:
                r4_actions = _rule_4_low_engagement(active_ads)
                for action in r4_actions:
                    action["client_id"] = str(client.id)
                    logger.info("    R4 ACTION: %s", action["action"])
                    results["actions_taken"].append(action)
                    results["summary"]["R4_LOW_ENGAGEMENT"] += 1
                    results["ads_flagged"] += 1
                if not r4_actions:
                    logger.info("    R4: All ads meeting engagement thresholds")
            except Exception as exc:
                results["errors"].append({"rule": "R4", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Rule 4 failed: %s", exc)

            # ------------------------------------------------------------------
            # Rule 5: Ad Fatigue
            # ------------------------------------------------------------------
            logger.info("  --- Rule 5: Ad Fatigue Detection ---")
            try:
                r5_actions = _rule_5_ad_fatigue(active_ads)
                for action in r5_actions:
                    action["client_id"] = str(client.id)
                    logger.info("    R5 ACTION: %s", action["action"])
                    results["actions_taken"].append(action)
                    results["summary"]["R5_AD_FATIGUE"] += 1
                    results["ads_flagged"] += 1
                if not r5_actions:
                    logger.info("    R5: No ad fatigue detected")
            except Exception as exc:
                results["errors"].append({"rule": "R5", "client_id": str(client.id), "error": str(exc)})
                logger.error("  Rule 5 failed: %s", exc)

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        total_actions = len(results["actions_taken"])
        logger.info("=== Optimization Cycle Complete ===")
        logger.info("  Clients processed: %d", results["clients_processed"])
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
