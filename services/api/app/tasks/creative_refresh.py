"""
ShiftOneZero Marketing Platform - Creative Refresh Task
Monitors all active ads for frequency fatigue (>4) and generates
new creative variants using Claude AI (mock) to keep ads fresh.
"""

import logging
import random
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

FREQUENCY_FATIGUE_THRESHOLD = 4.0
VARIANTS_TO_GENERATE = 3
MIN_IMPRESSIONS_FOR_CHECK = 5_000  # Don't check brand-new ads

# ---------------------------------------------------------------------------
# Mock active ads with creative data
# ---------------------------------------------------------------------------

MOCK_ACTIVE_ADS = [
    {
        "ad_id": "ad_301",
        "campaign_id": "camp_301",
        "name": "Matchday Tickets",
        "platform": "meta",
        "status": "active",
        "frequency": 4.5,
        "impressions": 85_000,
        "ctr": 3.8,
        "creative": {
            "type": "image",
            "headline": "Get your Demo Brand event tickets now!",
            "body": "Don't miss the action. Book your seats today.",
            "cta": "Buy Tickets",
            "image_url": "https://cdn.demo-brand.com/ads/matchday_tickets_v1.jpg",
        },
    },
    {
        "ad_id": "ad_302",
        "campaign_id": "camp_301",
        "name": "Matchday - Last Chance",
        "platform": "meta",
        "status": "active",
        "frequency": 5.2,
        "impressions": 72_000,
        "ctr": 2.5,
        "creative": {
            "type": "image",
            "headline": "Last chance for matchday tickets!",
            "body": "Only a few seats left for this Saturday's match. Act fast!",
            "cta": "Get Tickets",
            "image_url": "https://cdn.demo-brand.com/ads/matchday_last_chance_v1.jpg",
        },
    },
    {
        "ad_id": "ad_401",
        "campaign_id": "camp_401",
        "name": "Membership Drive",
        "platform": "tiktok",
        "status": "active",
        "frequency": 5.8,
        "impressions": 120_000,
        "ctr": 1.1,
        "creative": {
            "type": "video",
            "headline": "Join the Demo Brand family",
            "body": "Become a member and get exclusive perks, discounts, and early access.",
            "cta": "Join Now",
            "video_url": "https://cdn.demo-brand.com/ads/membership_drive_v1.mp4",
        },
    },
    {
        "ad_id": "ad_501",
        "campaign_id": "camp_501",
        "name": "Youth Academy Promo",
        "platform": "youtube",
        "status": "active",
        "frequency": 1.5,
        "impressions": 18_000,
        "ctr": 2.9,
        "creative": {
            "type": "video",
            "headline": "Shape the future of Croatian football",
            "body": "Demo Brand Academy -- where champions are made.",
            "cta": "Learn More",
            "video_url": "https://cdn.demo-brand.com/ads/youth_academy_v1.mp4",
        },
    },
    {
        "ad_id": "ad_601",
        "campaign_id": "camp_601",
        "name": "Merch Spring Collection",
        "platform": "meta",
        "status": "active",
        "frequency": 3.2,
        "impressions": 55_000,
        "ctr": 3.1,
        "creative": {
            "type": "carousel",
            "headline": "New Demo Brand spring collection",
            "body": "Represent the brand with the freshest gear.",
            "cta": "Shop Now",
            "images": [
                "https://cdn.demo-brand.com/ads/merch_spring_1.jpg",
                "https://cdn.demo-brand.com/ads/merch_spring_2.jpg",
                "https://cdn.demo-brand.com/ads/merch_spring_3.jpg",
            ],
        },
    },
    {
        "ad_id": "ad_701",
        "campaign_id": "camp_701",
        "name": "UCL Away Trip Package",
        "platform": "meta",
        "status": "active",
        "frequency": 4.1,
        "impressions": 40_000,
        "ctr": 4.2,
        "creative": {
            "type": "image",
            "headline": "Travel with Demo Brand to the Champions League!",
            "body": "All-inclusive away trip packages. Flights, hotel, and match ticket.",
            "cta": "Book Trip",
            "image_url": "https://cdn.demo-brand.com/ads/ucl_away_trip_v1.jpg",
        },
    },
]

# ---------------------------------------------------------------------------
# Mock Claude AI creative generator
# ---------------------------------------------------------------------------

HEADLINE_VARIATIONS = {
    "urgency": [
        "Only {n} days left -- {original_topic}",
        "Don't wait -- {original_topic}",
        "Time is running out for {original_topic}",
    ],
    "social_proof": [
        "Join {count}+ fans who already {action}",
        "Thousands of fans can't be wrong -- {original_topic}",
        "The Demo Brand community is buzzing about this",
    ],
    "emotion": [
        "Feel the blue heartbeat -- {original_topic}",
        "This is what being a Demo Brand fan is all about",
        "Make memories that last a lifetime",
    ],
}

BODY_VARIATIONS = {
    "concise": "Short, punchy copy that gets straight to the point.",
    "storytelling": "Narrative-driven copy that tells a mini story about the fan experience.",
    "benefit_focused": "Copy that leads with the top 3 benefits for the fan.",
}


def _mock_claude_generate_variants(ad: dict, num_variants: int) -> list:
    """
    Simulate Claude AI generating creative variants.

    In production this would call:
        POST https://api.anthropic.com/v1/messages
    with a prompt asking Claude to generate fresh ad copy variants
    based on the original creative and performance data.
    """
    logger.info(
        "Calling Claude AI (mock) to generate %d variants for ad %s...",
        num_variants, ad["ad_id"],
    )

    original = ad["creative"]
    variants = []

    styles = list(HEADLINE_VARIATIONS.keys())
    body_styles = list(BODY_VARIATIONS.keys())

    for i in range(num_variants):
        style = styles[i % len(styles)]
        body_style = body_styles[i % len(body_styles)]

        headline_template = random.choice(HEADLINE_VARIATIONS[style])
        new_headline = headline_template.format(
            n=random.randint(2, 7),
            original_topic=original["headline"].lower().rstrip("!."),
            count=random.choice(["5,000", "10,000", "15,000", "20,000"]),
            action="grabbed their spot",
        )

        variant = {
            "variant_id": f"{ad['ad_id']}_v{i+2}",
            "parent_ad_id": ad["ad_id"],
            "style": style,
            "headline": new_headline,
            "body": f"[{body_style.upper()}] {BODY_VARIATIONS[body_style]} Original theme: {original['body'][:60]}...",
            "cta": original.get("cta", "Learn More"),
            "creative_type": original["type"],
            "ai_model": "claude-opus-4-6-mock",
            "ai_rationale": (
                f"Generated {style} variant to combat frequency fatigue "
                f"(current freq={ad['frequency']}). Using {body_style} body "
                f"style to test different messaging approach."
            ),
            "status": "pending_review",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Suggest media refreshes
        if original["type"] == "image":
            variant["suggested_image_direction"] = random.choice([
                "Action shot from recent match with dynamic overlay",
                "Close-up fan celebration with stadium atmosphere",
                "Clean product shot with bold blue gradient background",
                "Split-screen before/after showing the fan experience",
            ])
        elif original["type"] == "video":
            variant["suggested_video_direction"] = random.choice([
                "Fast-paced 15s cut with trending audio",
                "Fan testimonial style with authentic footage",
                "Behind-the-scenes angle with player interaction",
                "Cinematic slow-mo highlights with voiceover",
            ])

        variants.append(variant)

    return variants


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.check_ad_fatigue",
    max_retries=3,
    default_retry_delay=180,
    acks_late=True,
)
def check_ad_fatigue(self):
    """
    Check all active ads for frequency fatigue and generate fresh
    creative variants using Claude AI.

    Iterates over all active clients. For each client, ads with
    frequency > 4 are flagged. For each fatigued ad, the task generates
    3 new creative variants for the team to review.
    Runs every 6 hours via Celery Beat.
    """
    from app.database import SyncSessionLocal
    from app.models.client import Client
    from sqlalchemy import select

    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Creative Refresh Check started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "clients_processed": 0,
        "ads_checked": 0,
        "ads_fatigued": 0,
        "ads_healthy": 0,
        "ads_skipped_low_impressions": 0,
        "variants_generated": 0,
        "fatigued_ads": [],
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

            # TODO: In production, query active ads from DB filtered by client_id
            active_ads = MOCK_ACTIVE_ADS

            for ad in active_ads:
                if ad["status"] != "active":
                    continue

                results["ads_checked"] += 1
                ad_id = ad["ad_id"]

                # Skip ads without enough data
                if ad["impressions"] < MIN_IMPRESSIONS_FOR_CHECK:
                    results["ads_skipped_low_impressions"] += 1
                    logger.debug(
                        "  Skipping %s -- only %d impressions (need %d)",
                        ad_id, ad["impressions"], MIN_IMPRESSIONS_FOR_CHECK,
                    )
                    continue

                # Check frequency
                if ad["frequency"] <= FREQUENCY_FATIGUE_THRESHOLD:
                    results["ads_healthy"] += 1
                    logger.info(
                        "  Ad %s (%s) -- frequency=%.1f -- HEALTHY",
                        ad_id, ad["name"], ad["frequency"],
                    )
                    continue

                # ---- Ad is fatigued ----
                results["ads_fatigued"] += 1
                logger.warning(
                    "  Ad %s (%s) -- frequency=%.1f -- FATIGUED (threshold=%.1f)",
                    ad_id, ad["name"], ad["frequency"], FREQUENCY_FATIGUE_THRESHOLD,
                )

                # Generate creative variants
                try:
                    variants = _mock_claude_generate_variants(ad, VARIANTS_TO_GENERATE)
                    results["variants_generated"] += len(variants)

                    fatigued_entry = {
                        "ad_id": ad_id,
                        "ad_name": ad["name"],
                        "platform": ad["platform"],
                        "frequency": ad["frequency"],
                        "impressions": ad["impressions"],
                        "ctr": ad["ctr"],
                        "client_id": str(client.id),
                        "variants": [],
                    }

                    for variant in variants:
                        logger.info(
                            "    Generated variant %s [%s]: \"%s\"",
                            variant["variant_id"],
                            variant["style"],
                            variant["headline"][:80],
                        )
                        fatigued_entry["variants"].append({
                            "variant_id": variant["variant_id"],
                            "style": variant["style"],
                            "headline": variant["headline"],
                            "status": variant["status"],
                        })

                    results["fatigued_ads"].append(fatigued_entry)

                    # In production: insert variants into creative_variants table
                    # for variant in variants:
                    #     variant["client_id"] = client.id
                    #     db.execute(insert(CreativeVariant).values(**variant))

                except Exception as exc:
                    results["errors"].append({"ad_id": ad_id, "client_id": str(client.id), "error": str(exc)})
                    logger.error("  Failed to generate variants for %s: %s", ad_id, exc)

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info("=== Creative Refresh Check Complete ===")
        logger.info("  Clients processed: %d", results["clients_processed"])
        logger.info("  Ads checked: %d", results["ads_checked"])
        logger.info("  Healthy: %d", results["ads_healthy"])
        logger.info("  Fatigued: %d", results["ads_fatigued"])
        logger.info("  Skipped (low impressions): %d", results["ads_skipped_low_impressions"])
        logger.info("  Variants generated: %d", results["variants_generated"])

        if results["ads_fatigued"] > 0:
            logger.info(
                "  Fatigued ads: %s",
                ", ".join(f"{a['ad_id']} (freq={a['frequency']})" for a in results["fatigued_ads"]),
            )

        if results["errors"]:
            logger.warning("  Errors: %d", len(results["errors"]))

        return results

    except Exception as exc:
        logger.exception("Creative refresh check crashed: %s", exc)
        raise self.retry(exc=exc)
