"""
ShiftOneZero Marketing Platform - Sentiment Analysis Task
Analyzes new comments across all platforms using Claude AI (mock).
Generates alerts when negative sentiment spikes above threshold.
"""

import logging
import random
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

NEGATIVE_SPIKE_THRESHOLD = 0.25  # Alert if >25% of batch is negative
ALERT_MINIMUM_COMMENTS = 10  # Need at least 10 comments before alerting
BATCH_SIZE = 50  # Process up to 50 comments per run

SENTIMENT_LABELS = ["positive", "neutral", "negative"]

# ---------------------------------------------------------------------------
# Mock unanalyzed comments
# ---------------------------------------------------------------------------

MOCK_COMMENTS = [
    {"id": "cmt_001", "post_id": "post_001", "platform": "meta", "author": "marko_zg", "text": "Ajmo Demo Brand! Najbolji brend!", "language": "hr"},
    {"id": "cmt_002", "post_id": "post_001", "platform": "meta", "author": "fansplit99", "text": "Demo Brand is doing great this season", "language": "en"},
    {"id": "cmt_003", "post_id": "post_002", "platform": "meta", "author": "nikola_r", "text": "Preskupo za obitelj od 4, nemoguce priustiti", "language": "hr"},
    {"id": "cmt_004", "post_id": "post_003", "platform": "tiktok", "author": "futbol_addict", "text": "This training drill is insane", "language": "en"},
    {"id": "cmt_005", "post_id": "post_003", "platform": "tiktok", "author": "hater_2000", "text": "Worst team in Europe, only good in Croatian league", "language": "en"},
    {"id": "cmt_006", "post_id": "post_005", "platform": "youtube", "author": "footyreviewer", "text": "Great highlights! That second goal was world class", "language": "en"},
    {"id": "cmt_007", "post_id": "post_005", "platform": "youtube", "author": "critic_99", "text": "Quality was terrible, Demo Brand needs to do better", "language": "en"},
    {"id": "cmt_008", "post_id": "post_001", "platform": "meta", "author": "ana_zagreb", "text": "Kad je sljedeca utakmica? Jedva cekam!", "language": "hr"},
    {"id": "cmt_009", "post_id": "post_004", "platform": "tiktok", "author": "merch_fan", "text": "Just ordered the new jersey, looks amazing", "language": "en"},
    {"id": "cmt_010", "post_id": "post_004", "platform": "tiktok", "author": "cheapskate42", "text": "80 EUR for a shirt? Robbery. I'm done supporting", "language": "en"},
    {"id": "cmt_011", "post_id": "post_002", "platform": "meta", "author": "competitor_fan", "text": "Konkurencija je bolja, Demo Brand pada", "language": "hr"},
    {"id": "cmt_012", "post_id": "post_006", "platform": "youtube", "author": "ucl_dreamer", "text": "Champions League nights at the home stadium are magical", "language": "en"},
    {"id": "cmt_013", "post_id": "post_007", "platform": "meta", "author": "petkovic_fan", "text": "Petkovic is the best striker in HNL history", "language": "en"},
    {"id": "cmt_014", "post_id": "post_007", "platform": "meta", "author": "realist_99", "text": "Interview is boring, ask harder questions", "language": "en"},
    {"id": "cmt_015", "post_id": "post_001", "platform": "meta", "author": "neutral_guy", "text": "Interesting game, could go either way", "language": "en"},
    {"id": "cmt_016", "post_id": "post_008", "platform": "meta", "author": "party_person", "text": "Fan zone events are always a great time", "language": "en"},
    {"id": "cmt_017", "post_id": "post_003", "platform": "tiktok", "author": "coach_wannabe", "text": "Formation is wrong, 4-3-3 won't work", "language": "en"},
    {"id": "cmt_018", "post_id": "post_005", "platform": "youtube", "author": "angry_ultra", "text": "Terrible defending, the whole back line needs replacing", "language": "en"},
    {"id": "cmt_019", "post_id": "post_006", "platform": "youtube", "author": "ticket_buyer", "text": "Just bought my ticket! Can't wait for the UCL match", "language": "en"},
    {"id": "cmt_020", "post_id": "post_008", "platform": "meta", "author": "concerned_parent", "text": "Is there a family section? Safety is important", "language": "en"},
]


# ---------------------------------------------------------------------------
# Mock Claude AI sentiment analyzer
# ---------------------------------------------------------------------------

def _mock_claude_sentiment_analysis(comments: list) -> list:
    """
    Simulate calling Claude AI API for sentiment analysis.

    In production this would call:
        POST https://api.anthropic.com/v1/messages
    with a prompt asking Claude to classify each comment's sentiment
    and extract key themes.
    """
    logger.info("Calling Claude AI (mock) to analyze %d comments...", len(comments))

    analyzed = []
    for comment in comments:
        text_lower = comment["text"].lower()

        # Simple heuristic to simulate Claude's analysis
        positive_signals = ["great", "best", "amazing", "love", "insane", "magical", "ajmo", "jedva cekam", "can't wait", "bought"]
        negative_signals = ["worst", "terrible", "awful", "robbery", "done supporting", "angry", "needs replacing", "boring", "wrong", "preskupo", "hater", "kupuje suce"]

        pos_score = sum(1 for w in positive_signals if w in text_lower)
        neg_score = sum(1 for w in negative_signals if w in text_lower)

        if pos_score > neg_score:
            sentiment = "positive"
            confidence = min(0.95, 0.70 + pos_score * 0.08)
        elif neg_score > pos_score:
            sentiment = "negative"
            confidence = min(0.95, 0.70 + neg_score * 0.08)
        else:
            sentiment = "neutral"
            confidence = round(random.uniform(0.55, 0.80), 2)

        # Simulate theme extraction
        themes = []
        if any(w in text_lower for w in ["ticket", "price", "preskupo", "eur", "robbery"]):
            themes.append("pricing")
        if any(w in text_lower for w in ["match", "game", "goal", "defend", "formation"]):
            themes.append("on_pitch")
        if any(w in text_lower for w in ["jersey", "merch", "kit", "shirt"]):
            themes.append("merchandise")
        if any(w in text_lower for w in ["ucl", "champions league"]):
            themes.append("champions_league")
        if any(w in text_lower for w in ["fan zone", "event", "atmosphere"]):
            themes.append("fan_experience")
        if not themes:
            themes.append("general")

        analyzed.append({
            "comment_id": comment["id"],
            "post_id": comment["post_id"],
            "platform": comment["platform"],
            "author": comment["author"],
            "text": comment["text"],
            "language": comment["language"],
            "sentiment": sentiment,
            "confidence": round(confidence, 2),
            "themes": themes,
            "requires_response": sentiment == "negative" and confidence > 0.80,
            "ai_model": "claude-opus-4-6-mock",
        })

    return analyzed


def _generate_alerts(analyzed_comments: list) -> list:
    """Generate alerts based on sentiment patterns."""
    alerts = []
    total = len(analyzed_comments)
    if total < ALERT_MINIMUM_COMMENTS:
        return alerts

    negative_comments = [c for c in analyzed_comments if c["sentiment"] == "negative"]
    neg_ratio = len(negative_comments) / total

    if neg_ratio > NEGATIVE_SPIKE_THRESHOLD:
        # Group negative comments by theme
        theme_counts = {}
        for c in negative_comments:
            for theme in c["themes"]:
                theme_counts[theme] = theme_counts.get(theme, 0) + 1

        top_theme = max(theme_counts, key=theme_counts.get) if theme_counts else "unknown"

        alerts.append({
            "type": "negative_sentiment_spike",
            "severity": "high" if neg_ratio > 0.40 else "medium",
            "negative_count": len(negative_comments),
            "total_count": total,
            "negative_ratio": round(neg_ratio * 100, 1),
            "top_negative_theme": top_theme,
            "message": (
                f"Negative sentiment spike: {neg_ratio*100:.1f}% of {total} comments are negative. "
                f"Top theme: {top_theme}."
            ),
            "sample_comments": [c["text"][:100] for c in negative_comments[:3]],
        })

    # Check for comments requiring response
    response_needed = [c for c in analyzed_comments if c.get("requires_response")]
    if response_needed:
        alerts.append({
            "type": "response_needed",
            "severity": "medium",
            "count": len(response_needed),
            "message": f"{len(response_needed)} negative comments with high confidence require team response",
            "comment_ids": [c["comment_id"] for c in response_needed],
        })

    return alerts


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="tasks.analyze_new_comments",
    max_retries=3,
    default_retry_delay=90,
    acks_late=True,
)
def analyze_new_comments(self):
    """
    Analyze new unprocessed comments for sentiment using Claude AI.

    Classifies each comment as positive / neutral / negative with a
    confidence score, extracts themes, and generates alerts for negative
    sentiment spikes. Runs every 20 minutes via Celery Beat.
    """
    run_ts = datetime.now(timezone.utc).isoformat()
    logger.info("=== Sentiment Analysis started at %s ===", run_ts)

    results = {
        "timestamp": run_ts,
        "comments_analyzed": 0,
        "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
        "avg_confidence": 0.0,
        "themes_detected": {},
        "alerts": [],
        "response_queue": [],
        "errors": [],
    }

    try:
        # ------------------------------------------------------------------
        # 1. Fetch unanalyzed comments (mock: take a random subset)
        # ------------------------------------------------------------------
        batch = random.sample(MOCK_COMMENTS, min(BATCH_SIZE, len(MOCK_COMMENTS)))
        logger.info("Fetched %d unanalyzed comments for processing", len(batch))

        if not batch:
            logger.info("No new comments to analyze. Exiting.")
            return results

        # ------------------------------------------------------------------
        # 2. Run Claude AI sentiment analysis (mock)
        # ------------------------------------------------------------------
        analyzed = _mock_claude_sentiment_analysis(batch)
        results["comments_analyzed"] = len(analyzed)

        # ------------------------------------------------------------------
        # 3. Aggregate results
        # ------------------------------------------------------------------
        total_confidence = 0.0
        for comment in analyzed:
            sentiment = comment["sentiment"]
            results["sentiment_breakdown"][sentiment] += 1
            total_confidence += comment["confidence"]

            for theme in comment["themes"]:
                results["themes_detected"][theme] = results["themes_detected"].get(theme, 0) + 1

            if comment.get("requires_response"):
                results["response_queue"].append({
                    "comment_id": comment["comment_id"],
                    "platform": comment["platform"],
                    "author": comment["author"],
                    "text": comment["text"][:150],
                })

            logger.debug(
                "Comment %s -- sentiment=%s (%.0f%%), themes=%s",
                comment["comment_id"],
                comment["sentiment"],
                comment["confidence"] * 100,
                ", ".join(comment["themes"]),
            )

        results["avg_confidence"] = round(total_confidence / len(analyzed), 2) if analyzed else 0.0

        pos = results["sentiment_breakdown"]["positive"]
        neu = results["sentiment_breakdown"]["neutral"]
        neg = results["sentiment_breakdown"]["negative"]
        total = len(analyzed)
        logger.info(
            "Sentiment results -- positive=%d (%.0f%%), neutral=%d (%.0f%%), negative=%d (%.0f%%), avg_confidence=%.0f%%",
            pos, (pos / total) * 100 if total else 0,
            neu, (neu / total) * 100 if total else 0,
            neg, (neg / total) * 100 if total else 0,
            results["avg_confidence"] * 100,
        )

        logger.info("Themes detected: %s", results["themes_detected"])

        # ------------------------------------------------------------------
        # 4. Generate alerts
        # ------------------------------------------------------------------
        results["alerts"] = _generate_alerts(analyzed)
        for alert in results["alerts"]:
            logger.warning(
                "ALERT [%s/%s]: %s",
                alert["type"],
                alert["severity"],
                alert["message"],
            )

        if results["response_queue"]:
            logger.info(
                "%d comments added to response queue",
                len(results["response_queue"]),
            )

        # ------------------------------------------------------------------
        # In production: persist results
        # ------------------------------------------------------------------
        # for comment in analyzed:
        #     db.execute(
        #         update(Comment)
        #         .where(Comment.id == comment["comment_id"])
        #         .values(sentiment=comment["sentiment"], confidence=comment["confidence"])
        #     )

        logger.info(
            "=== Sentiment Analysis complete -- %d comments analyzed, %d alerts generated ===",
            results["comments_analyzed"],
            len(results["alerts"]),
        )

        return results

    except Exception as exc:
        logger.exception("Sentiment analysis crashed: %s", exc)
        raise self.retry(exc=exc)
