"""Modul 3: Competitor Intelligence Hub service."""

import json
import logging
import re
from datetime import date, datetime, timedelta
from uuid import UUID

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.competitor import Competitor, CompetitorAlert, CompetitorMetric

logger = logging.getLogger(__name__)

# OpenRouter config (same pattern as client_intelligence.py)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "google/gemini-2.5-pro"

_SWOT_SYSTEM_PROMPT = """Ti si marketinški strateg s iskustvom u digitalnom marketingu i konkurentskoj analizi.
Tvoj zadatak je napraviti SWOT analizu za zadanu tvrtku.
Odgovori ISKLJUČIVO u JSON formatu — bez teksta oko njega."""

_SWOT_USER_PROMPT = """Napravi SWOT analizu za kompaniju "{competitor_name}" koja je u industriji "{industry}" u usporedbi s brendom "{our_brand}".

Kontekst o našem brendu:
{brand_context}

Vrati ISKLJUČIVO JSON:
{{
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "opportunities": ["...", "..."],
  "threats": ["...", "..."]
}}

Svaka kategorija mora imati 3-5 stavki. Stavke moraju biti konkretne i specifične za zadane tvrtke.
SAMO JSON, bez teksta."""

# Engagement spike threshold: 2x the 30-day average
SPIKE_THRESHOLD = 2.0

# Default competitors for benchmark group
DEFAULT_COMPETITORS = [
    "Red Star Belgrade",
    "Olympiacos",
    "Celtic",
    "Red Bull Salzburg",
    "Shakhtar Donetsk",
    "PAOK",
    "Ferencvaros",
    "Malmo FF",
]


def _validate_swot(data: dict) -> dict:
    """Ensure SWOT dict has the expected shape with string lists."""
    validated = {}
    for key in ("strengths", "weaknesses", "opportunities", "threats"):
        items = data.get(key, [])
        if not isinstance(items, list):
            items = [str(items)] if items else []
        validated[key] = [str(item) for item in items]
    return validated


class CompetitorIntelService:
    def __init__(self, meta_client, youtube_client):
        self.meta_client = meta_client
        self.youtube_client = youtube_client

    async def scan_all_competitors(self, db: AsyncSession) -> list[dict]:
        """Scan all registered competitors and update their metrics."""
        result = await db.execute(select(Competitor))
        competitors = result.scalars().all()

        if not competitors:
            logger.warning("No competitors found in database")
            return [
                {
                    "name": name,
                    "status": "not_registered",
                    "message": "Competitor not yet in database",
                }
                for name in DEFAULT_COMPETITORS
            ]

        scan_results = []
        today = date.today()

        for comp in competitors:
            try:
                # Fetch Instagram metrics via Meta API
                ig_data = await self.meta_client.get_public_profile_stats(comp.short_name)
                ig_metric = CompetitorMetric(
                    competitor_id=comp.id,
                    platform="instagram",
                    date=today,
                    followers=ig_data.get("followers", 0),
                    engagement_rate=ig_data.get("engagement_rate", 0.0),
                    content_formats=ig_data.get("content_formats"),
                    target_markets=ig_data.get("target_markets"),
                    language_strategy=ig_data.get("language_strategy", ""),
                )
                db.add(ig_metric)

                # Fetch YouTube metrics
                yt_data = await self.youtube_client.get_channel_stats(comp.short_name)
                yt_metric = CompetitorMetric(
                    competitor_id=comp.id,
                    platform="youtube",
                    date=today,
                    followers=yt_data.get("subscribers", 0),
                    engagement_rate=yt_data.get("engagement_rate", 0.0),
                    content_formats=yt_data.get("content_formats"),
                    target_markets=yt_data.get("target_markets"),
                    language_strategy=yt_data.get("language_strategy", ""),
                )
                db.add(yt_metric)

                scan_results.append({
                    "competitor_id": str(comp.id),
                    "name": comp.name,
                    "instagram_followers": ig_data.get("followers", 0),
                    "instagram_engagement": ig_data.get("engagement_rate", 0.0),
                    "youtube_subscribers": yt_data.get("subscribers", 0),
                    "youtube_engagement": yt_data.get("engagement_rate", 0.0),
                    "status": "scanned",
                })
            except Exception as exc:
                logger.error(f"Failed to scan competitor {comp.name}: {exc}")
                scan_results.append({
                    "competitor_id": str(comp.id),
                    "name": comp.name,
                    "status": "error",
                    "error": str(exc),
                })

        await db.flush()
        logger.info(f"Scanned {len(scan_results)} competitors")
        return scan_results

    async def generate_swot(self, competitor, client) -> dict:
        """Generate AI SWOT analysis for a competitor using OpenRouter (Gemini 2.5 Pro).

        Args:
            competitor: Competitor model instance
            client: Client model instance (our brand)

        Returns:
            dict with keys: strengths, weaknesses, opportunities, threats
        """
        from app.config import settings

        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            logger.warning("No OPENROUTER_API_KEY configured, returning placeholder SWOT")
            return {
                "strengths": ["API ključ nije konfiguriran — SWOT analiza nije dostupna"],
                "weaknesses": [],
                "opportunities": [],
                "threats": [],
            }

        brand_context = (
            f"Naziv: {client.name}\n"
            f"Opis: {client.business_description or 'Nije definirano'}\n"
            f"Ciljna publika: {client.target_audience or 'Nije definirano'}\n"
            f"Ton: {client.tone_of_voice or 'Profesionalan'}"
        )

        user_prompt = _SWOT_USER_PROMPT.format(
            competitor_name=competitor.name,
            industry=competitor.league,  # league field stores industry/sector
            our_brand=client.name,
            brand_context=brand_context,
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shiftonezero.xyler.ai",
            "X-Title": "ShiftOneZero Marketing Platform",
        }

        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": _SWOT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
            "max_tokens": 4096,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as http_client:
                response = await http_client.post(
                    OPENROUTER_URL, json=payload, headers=headers
                )
                response.raise_for_status()

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            logger.info(
                "SWOT response for %s: %d chars", competitor.name, len(content)
            )

            swot = self._parse_swot_response(content)
            return swot

        except Exception as exc:
            logger.error("SWOT generation failed for %s: %s", competitor.name, exc)
            raise

    @staticmethod
    def _parse_swot_response(content: str) -> dict:
        """Parse AI SWOT response, handling markdown fences and quirks."""
        content = content.strip()

        # Strip markdown fences
        if content.startswith("```"):
            first_newline = content.index("\n")
            content = content[first_newline + 1:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        # Remove trailing commas before ] or }
        content = re.sub(r",\s*([}\]])", r"\1", content)

        # Try direct parse
        try:
            result = json.loads(content)
            if isinstance(result, dict):
                return _validate_swot(result)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON object
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1:
            try:
                result = json.loads(content[start : end + 1])
                if isinstance(result, dict):
                    return _validate_swot(result)
            except json.JSONDecodeError:
                pass

        logger.error("Failed to parse SWOT response: %s", content[:500])
        raise ValueError("Could not parse AI SWOT response as JSON")

    async def get_competitor_comparison(self, db: AsyncSession) -> dict:
        """Generate a gap analysis comparing the brand vs all competitors."""
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        # Get latest competitor metrics
        latest_subq = (
            select(
                CompetitorMetric.competitor_id,
                CompetitorMetric.platform,
                func.max(CompetitorMetric.date).label("max_date"),
            )
            .group_by(CompetitorMetric.competitor_id, CompetitorMetric.platform)
            .subquery()
        )

        result = await db.execute(
            select(CompetitorMetric, Competitor)
            .join(Competitor, CompetitorMetric.competitor_id == Competitor.id)
            .join(
                latest_subq,
                (CompetitorMetric.competitor_id == latest_subq.c.competitor_id)
                & (CompetitorMetric.platform == latest_subq.c.platform)
                & (CompetitorMetric.date == latest_subq.c.max_date),
            )
        )
        rows = result.all()

        if not rows:
            return {
                "status": "no_data",
                "message": "No competitor metrics available. Run a scan first.",
            }

        # Build comparison by competitor
        competitor_data: dict = {}
        for metric, comp in rows:
            if comp.name not in competitor_data:
                competitor_data[comp.name] = {
                    "name": comp.name,
                    "country": comp.country,
                    "league": comp.league,
                    "platforms": {},
                }
            competitor_data[comp.name]["platforms"][metric.platform] = {
                "followers": metric.followers,
                "engagement_rate": metric.engagement_rate,
                "language_strategy": metric.language_strategy,
            }

        # Calculate averages for benchmarking
        all_ig_followers = [
            d["platforms"]["instagram"]["followers"]
            for d in competitor_data.values()
            if "instagram" in d["platforms"]
        ]
        all_ig_engagement = [
            d["platforms"]["instagram"]["engagement_rate"]
            for d in competitor_data.values()
            if "instagram" in d["platforms"]
        ]

        avg_ig_followers = sum(all_ig_followers) / len(all_ig_followers) if all_ig_followers else 0
        avg_ig_engagement = (
            sum(all_ig_engagement) / len(all_ig_engagement) if all_ig_engagement else 0.0
        )

        return {
            "analysis_date": today.isoformat(),
            "competitors": list(competitor_data.values()),
            "benchmarks": {
                "avg_instagram_followers": int(avg_ig_followers),
                "avg_instagram_engagement": round(avg_ig_engagement, 2),
            },
            "total_competitors": len(competitor_data),
        }

    async def check_competitor_alerts(self, db: AsyncSession) -> list[dict]:
        """Detect engagement spikes or viral posts from competitors."""
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        result = await db.execute(select(Competitor))
        competitors = result.scalars().all()

        alerts = []
        for comp in competitors:
            # Get recent metrics
            recent_result = await db.execute(
                select(CompetitorMetric)
                .where(
                    CompetitorMetric.competitor_id == comp.id,
                    CompetitorMetric.date >= seven_days_ago,
                )
                .order_by(CompetitorMetric.date.desc())
            )
            recent_metrics = recent_result.scalars().all()

            # Get 30-day baseline
            baseline_result = await db.execute(
                select(func.avg(CompetitorMetric.engagement_rate))
                .where(
                    CompetitorMetric.competitor_id == comp.id,
                    CompetitorMetric.date >= thirty_days_ago,
                    CompetitorMetric.date < seven_days_ago,
                )
            )
            baseline_avg = baseline_result.scalar() or 0.0

            for metric in recent_metrics:
                if baseline_avg > 0 and metric.engagement_rate > baseline_avg * SPIKE_THRESHOLD:
                    spike_ratio = metric.engagement_rate / baseline_avg
                    alert = CompetitorAlert(
                        competitor_id=comp.id,
                        alert_type="engagement_spike",
                        description=(
                            f"{comp.name} engagement spike on {metric.platform}: "
                            f"{metric.engagement_rate:.1f}% vs {baseline_avg:.1f}% baseline "
                            f"({spike_ratio:.1f}x)"
                        ),
                        engagement_spike=spike_ratio,
                    )
                    db.add(alert)
                    alerts.append({
                        "competitor": comp.name,
                        "alert_type": "engagement_spike",
                        "platform": metric.platform,
                        "current_engagement": metric.engagement_rate,
                        "baseline_engagement": round(baseline_avg, 2),
                        "spike_ratio": round(spike_ratio, 1),
                        "date": metric.date.isoformat(),
                    })

        # Also return recent unread alerts from DB
        unread_result = await db.execute(
            select(CompetitorAlert, Competitor)
            .join(Competitor, CompetitorAlert.competitor_id == Competitor.id)
            .where(CompetitorAlert.is_read == False)
            .order_by(CompetitorAlert.detected_at.desc())
            .limit(20)
        )
        for alert_row, comp_row in unread_result.all():
            alerts.append({
                "alert_id": str(alert_row.id),
                "competitor": comp_row.name,
                "alert_type": alert_row.alert_type,
                "description": alert_row.description,
                "spike_ratio": alert_row.engagement_spike,
                "detected_at": alert_row.detected_at.isoformat(),
                "is_read": alert_row.is_read,
            })

        await db.flush()
        logger.info(f"Checked alerts for {len(competitors)} competitors, found {len(alerts)}")
        return alerts
