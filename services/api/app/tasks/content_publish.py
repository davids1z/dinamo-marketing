"""
Dinamo Marketing Platform - Content Publishing Task
Checks for approved content scheduled for publishing and pushes it
to the appropriate platforms via Buffer (mock).
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PUBLISH_WINDOW_MINUTES = 10  # Content within +/- 10 min of scheduled time
SUPPORTED_PLATFORMS = ["facebook", "instagram", "twitter_x", "tiktok", "youtube", "linkedin"]

# ---------------------------------------------------------------------------
# Mock scheduled content queue
# ---------------------------------------------------------------------------


def _build_mock_content_queue():
    """Build mock content queue with fresh timestamps each run."""
    now = datetime.now(timezone.utc)
    return [
        {
            "content_id": "cnt_001",
            "title": "Matchday Announcement - Dinamo vs Rijeka",
            "type": "image_post",
            "platforms": ["facebook", "instagram", "twitter_x"],
            "status": "approved",
            "scheduled_at": (now - timedelta(minutes=3)).isoformat(),
            "published_at": None,
            "author": "social_team",
            "campaign_id": "camp_org_01",
            "media": [{"type": "image", "url": "https://cdn.dinamo.hr/matchday_rijeka.jpg", "size_kb": 450}],
            "caption": "Matchday! Dinamo vs Rijeka at Maksimir, kickoff 20:00. Who's coming? #GNKD #HNL",
            "hashtags": ["#GNKD", "#HNL", "#DinamoZagreb", "#Matchday"],
        },
        {
            "content_id": "cnt_002",
            "title": "Training Session Behind the Scenes",
            "type": "video_post",
            "platforms": ["tiktok", "instagram"],
            "status": "approved",
            "scheduled_at": (now + timedelta(minutes=2)).isoformat(),
            "published_at": None,
            "author": "content_creator",
            "campaign_id": None,
            "media": [{"type": "video", "url": "https://cdn.dinamo.hr/training_bts_v2.mp4", "size_kb": 28000, "duration_sec": 45}],
            "caption": "Work never stops. Behind the scenes at today's training session.",
            "hashtags": ["#Dinamo", "#BehindTheScenes", "#Training"],
        },
        {
            "content_id": "cnt_003",
            "title": "Player Birthday - Petkovic",
            "type": "image_post",
            "platforms": ["facebook", "instagram", "twitter_x"],
            "status": "approved",
            "scheduled_at": (now + timedelta(hours=3)).isoformat(),
            "published_at": None,
            "author": "social_team",
            "campaign_id": None,
            "media": [{"type": "image", "url": "https://cdn.dinamo.hr/petkovic_birthday.jpg", "size_kb": 320}],
            "caption": "Happy Birthday to our number 9! Have a great day, Bruno!",
            "hashtags": ["#Dinamo", "#HappyBirthday", "#GNKD"],
        },
        {
            "content_id": "cnt_004",
            "title": "UCL Ticket Pre-Sale",
            "type": "carousel_post",
            "platforms": ["facebook", "instagram"],
            "status": "approved",
            "scheduled_at": (now - timedelta(minutes=5)).isoformat(),
            "published_at": None,
            "author": "marketing_team",
            "campaign_id": "camp_ucl_tickets",
            "media": [
                {"type": "image", "url": "https://cdn.dinamo.hr/ucl_ticket_1.jpg", "size_kb": 380},
                {"type": "image", "url": "https://cdn.dinamo.hr/ucl_ticket_2.jpg", "size_kb": 350},
                {"type": "image", "url": "https://cdn.dinamo.hr/ucl_ticket_3.jpg", "size_kb": 400},
            ],
            "caption": "UCL tickets pre-sale starts NOW for members. Don't miss out on the biggest night in Croatian football.",
            "hashtags": ["#GNKD", "#UCL", "#ChampionsLeague", "#DinamoZagreb"],
        },
        {
            "content_id": "cnt_005",
            "title": "Weekly Stats Recap",
            "type": "image_post",
            "platforms": ["twitter_x", "linkedin"],
            "status": "draft",  # Not approved yet
            "scheduled_at": (now + timedelta(minutes=1)).isoformat(),
            "published_at": None,
            "author": "analytics_team",
            "campaign_id": None,
            "media": [{"type": "image", "url": "https://cdn.dinamo.hr/weekly_stats.jpg", "size_kb": 280}],
            "caption": "Our weekly performance in numbers. What a week for the Blues!",
            "hashtags": ["#Dinamo", "#Stats", "#GNKD"],
        },
        {
            "content_id": "cnt_006",
            "title": "Merch Drop Teaser",
            "type": "video_post",
            "platforms": ["tiktok", "instagram"],
            "status": "approved",
            "scheduled_at": (now - timedelta(hours=2)).isoformat(),
            "published_at": (now - timedelta(hours=2)).isoformat(),  # Already published
            "author": "content_creator",
            "campaign_id": "camp_merch_spring",
            "media": [{"type": "video", "url": "https://cdn.dinamo.hr/merch_teaser.mp4", "size_kb": 15000, "duration_sec": 30}],
            "caption": "Something new is coming. Stay tuned.",
            "hashtags": ["#Dinamo", "#NewMerch", "#ComingSoon"],
        },
    ]


# ---------------------------------------------------------------------------
# Mock Buffer API
# ---------------------------------------------------------------------------

class MockBufferAPI:
    """Simulates Buffer API for scheduling and publishing content."""

    @staticmethod
    def publish(content: dict, platform: str) -> dict:
        """
        Simulate publishing content via Buffer API.

        In production:
            POST https://api.bufferapp.com/1/updates/create.json
        """
        # Simulate occasional failures
        if random.random() < 0.05:
            raise ConnectionError(f"Buffer API timeout for {platform}")

        platform_post_id = f"{platform}_{random.randint(100000, 999999)}"
        return {
            "success": True,
            "buffer_update_id": f"buf_{random.randint(100000, 999999)}",
            "platform": platform,
            "platform_post_id": platform_post_id,
            "published_url": f"https://{platform}.com/dinamozagreb/posts/{platform_post_id}",
            "published_at": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def validate_media(media: list, platform: str) -> dict:
        """Validate that media meets platform requirements."""
        max_sizes = {
            "facebook": {"image": 10_000, "video": 1_048_576},
            "instagram": {"image": 8_000, "video": 650_000},
            "twitter_x": {"image": 5_000, "video": 512_000},
            "tiktok": {"image": 5_000, "video": 287_000},
            "youtube": {"image": 5_000, "video": 12_800_000},
            "linkedin": {"image": 10_000, "video": 5_120_000},
        }

        limits = max_sizes.get(platform, {"image": 5_000, "video": 500_000})
        errors = []

        for item in media:
            media_type = item.get("type", "image")
            size_kb = item.get("size_kb", 0)
            max_kb = limits.get(media_type, 5_000)
            if size_kb > max_kb:
                errors.append(f"{media_type} too large: {size_kb}KB > {max_kb}KB for {platform}")

        return {"valid": len(errors) == 0, "errors": errors}


buffer_api = MockBufferAPI()


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _is_within_publish_window(scheduled_at_str: str) -> bool:
    """Check if the scheduled time is within the publish window."""
    scheduled_at = datetime.fromisoformat(scheduled_at_str)
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    current = datetime.now(timezone.utc)
    delta = abs((current - scheduled_at).total_seconds())
    return delta <= PUBLISH_WINDOW_MINUTES * 60


def _is_already_published(content: dict) -> bool:
    """Check if content was already published."""
    return content.get("published_at") is not None


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.publish_scheduled_content",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def publish_scheduled_content(self):
    """
    Check for approved content scheduled for now and publish via Buffer.

    Validates media, publishes to each target platform, and logs results.
    Runs every 5 minutes via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Content Publishing check started at %s ===", run_ts)

    content_queue = _build_mock_content_queue()

    results = {
        "timestamp": run_ts,
        "content_checked": 0,
        "content_eligible": 0,
        "publish_attempts": 0,
        "publish_success": 0,
        "publish_failed": 0,
        "skipped_not_approved": 0,
        "skipped_not_scheduled": 0,
        "skipped_already_published": 0,
        "published_items": [],
        "errors": [],
    }

    try:
        for content in content_queue:
            results["content_checked"] += 1
            content_id = content["content_id"]

            # Skip if already published
            if _is_already_published(content):
                results["skipped_already_published"] += 1
                logger.debug("Skipping %s -- already published", content_id)
                continue

            # Skip if not approved
            if content["status"] != "approved":
                results["skipped_not_approved"] += 1
                logger.debug("Skipping %s -- status=%s (not approved)", content_id, content["status"])
                continue

            # Skip if not within publish window
            if not _is_within_publish_window(content["scheduled_at"]):
                results["skipped_not_scheduled"] += 1
                logger.debug("Skipping %s -- not within publish window", content_id)
                continue

            results["content_eligible"] += 1
            logger.info(
                "Publishing %s: \"%s\" [%s] to %s",
                content_id,
                content["title"],
                content["type"],
                ", ".join(content["platforms"]),
            )

            # Publish to each target platform
            platform_results = []
            for platform in content["platforms"]:
                results["publish_attempts"] += 1

                # Validate media first
                validation = buffer_api.validate_media(content.get("media", []), platform)
                if not validation["valid"]:
                    results["publish_failed"] += 1
                    error_msg = f"Media validation failed for {platform}: {validation['errors']}"
                    results["errors"].append({"content_id": content_id, "platform": platform, "error": error_msg})
                    logger.warning("  %s: %s", platform, error_msg)
                    continue

                # Publish
                try:
                    pub_result = buffer_api.publish(content, platform)
                    results["publish_success"] += 1
                    platform_results.append(pub_result)
                    logger.info(
                        "  Published to %s -- url=%s, buffer_id=%s",
                        platform,
                        pub_result["published_url"],
                        pub_result["buffer_update_id"],
                    )
                except Exception as exc:
                    results["publish_failed"] += 1
                    results["errors"].append({
                        "content_id": content_id,
                        "platform": platform,
                        "error": str(exc),
                    })
                    logger.error("  Failed to publish to %s: %s", platform, exc)

            if platform_results:
                results["published_items"].append({
                    "content_id": content_id,
                    "title": content["title"],
                    "type": content["type"],
                    "platforms_published": [r["platform"] for r in platform_results],
                    "urls": [r["published_url"] for r in platform_results],
                })

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        logger.info("=== Content Publishing Complete ===")
        logger.info("  Checked: %d, Eligible: %d", results["content_checked"], results["content_eligible"])
        logger.info(
            "  Published: %d/%d attempts succeeded",
            results["publish_success"], results["publish_attempts"],
        )
        logger.info(
            "  Skipped -- not approved: %d, not scheduled: %d, already published: %d",
            results["skipped_not_approved"],
            results["skipped_not_scheduled"],
            results["skipped_already_published"],
        )

        if results["errors"]:
            logger.warning("  Errors: %d", len(results["errors"]))

        return results

    except Exception as exc:
        logger.exception("Content publishing crashed: %s", exc)
        raise self.retry(exc=exc)
