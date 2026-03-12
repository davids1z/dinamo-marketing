"""Real Claude (Anthropic) API client for AI-powered content generation.

Uses the Anthropic Messages API via httpx. Each method sends a structured
prompt and parses JSON from the response.
"""

from __future__ import annotations

import json
import logging
import re

import httpx

from app.integrations.base import ClaudeClientBase
from app.integrations.openrouter import build_system_prompt

logger = logging.getLogger(__name__)

# Fallback system prompt used when no client context is available
_FALLBACK_BRAND_SYSTEM = (
    "You are an expert marketing strategist for a brand's marketing platform. "
    "You help create compelling content, analyze performance data, and generate "
    "strategic recommendations for social media marketing.\n\n"
    "Always respond with valid JSON unless instructed otherwise."
)

_JSON_SUFFIX = "\n\nAlways respond with valid JSON unless instructed otherwise."


def _get_brand_system(client=None) -> str:
    """Get the brand system prompt, using client context if available."""
    if client is None:
        return _FALLBACK_BRAND_SYSTEM
    return build_system_prompt(client) + _JSON_SUFFIX


def _parse_json(text: str) -> dict | list:
    """Extract JSON from Claude's response, handling markdown code blocks."""
    # Try direct parse first
    text = text.strip()
    if text.startswith("{") or text.startswith("["):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # Try extracting from code blocks
    match = re.search(r"```(?:json)?\s*\n?([\s\S]*?)\n?```", text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Last resort: find first { or [ and parse from there
    for i, ch in enumerate(text):
        if ch in "{[":
            try:
                return json.loads(text[i:])
            except json.JSONDecodeError:
                continue

    raise ValueError(f"Could not parse JSON from response: {text[:200]}")


class ClaudeClient(ClaudeClientBase):
    """Production Anthropic Claude API client."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self._api_key = api_key
        self._model = model
        self._base_url = "https://api.anthropic.com/v1"

    async def _call(self, system: str, user_msg: str, max_tokens: int = 4096) -> str:
        """Send a message to the Anthropic Messages API."""
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self._base_url}/messages",
                headers={
                    "x-api-key": self._api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self._model,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": user_msg}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            # Extract text from content blocks
            content = data.get("content", [])
            return "".join(b.get("text", "") for b in content if b.get("type") == "text")

    async def health_check(self) -> dict:
        try:
            text = await self._call(
                "Respond with valid JSON.",
                'Return {"status":"ok"}',
                max_tokens=64,
            )
            return _parse_json(text)
        except Exception as exc:
            return {"status": "error", "error": str(exc)}

    async def generate_content_plan(self, context: dict, client=None) -> dict:
        system = _get_brand_system(client)
        prompt = (
            "Generate a weekly content plan for the brand social media.\n\n"
            f"Context: {json.dumps(context, default=str)}\n\n"
            "Return a JSON object with keys:\n"
            "- plan_id (string)\n"
            "- period (string date range)\n"
            "- theme (string)\n"
            "- items (array of 7 objects, each with: date, platform, content_type, "
            "topic, caption, hashtags, best_time_to_post, visual_direction)\n"
            "- strategy_notes (string paragraph)"
        )
        text = await self._call(system, prompt)
        return _parse_json(text)

    async def generate_post_copy(self, brief: dict, client=None) -> dict:
        system = _get_brand_system(client)
        prompt = (
            "Generate social media post copy for the brand.\n\n"
            f"Brief: {json.dumps(brief, default=str)}\n\n"
            "Return JSON with keys: headline, body, call_to_action, hashtags (array), "
            "platform, tone, estimated_engagement"
        )
        text = await self._call(system, prompt, max_tokens=1024)
        return _parse_json(text)

    async def generate_ab_variants(self, base_copy: str, num_variants: int = 3, client=None) -> list[dict]:
        system = _get_brand_system(client)
        prompt = (
            f"Generate {num_variants} A/B test copy variants for this ad:\n\n"
            f'"{base_copy}"\n\n'
            "Return a JSON array. Each element has: variant_id (var_A, var_B, ...), "
            "label, copy, rationale, predicted_ctr (float)"
        )
        text = await self._call(system, prompt, max_tokens=2048)
        result = _parse_json(text)
        return result if isinstance(result, list) else result.get("variants", [result])

    async def analyze_sentiment(self, texts: list[str], client=None) -> list[dict]:
        system = _get_brand_system(client)
        prompt = (
            "Analyze the sentiment of each text below. Return a JSON array.\n"
            "Each element: text, sentiment (positive/neutral/negative), "
            "confidence (0-1 float), key_phrases (array), emotion (string)\n\n"
            "Texts:\n" + "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
        )
        text = await self._call(system, prompt, max_tokens=2048)
        result = _parse_json(text)
        return result if isinstance(result, list) else [result]

    async def generate_report_summary(self, data: dict, client=None) -> str:
        system = _get_brand_system(client)
        prompt = (
            "Write a concise weekly performance summary for the brand's "
            "marketing team based on this data. Use plain text (not JSON). "
            "Include: overall performance, channel insights, key actions.\n\n"
            f"Data: {json.dumps(data, default=str)}"
        )
        return await self._call(system, prompt, max_tokens=2048)

    async def generate_strategy_recommendation(self, performance_data: dict, client=None) -> dict:
        system = _get_brand_system(client)
        prompt = (
            "Generate a strategic marketing recommendation for the brand.\n\n"
            f"Performance data: {json.dumps(performance_data, default=str)}\n\n"
            "Return JSON with keys:\n"
            "- summary (string paragraph)\n"
            "- strengths (array of strings)\n"
            "- weaknesses (array of strings)\n"
            "- opportunities (array of strings)\n"
            "- recommended_actions (array of objects with: action, priority, "
            "timeline, expected_impact, budget_required)\n"
            "- projected_impact (object with: follower_growth_30d, "
            "engagement_rate_change, website_traffic_change, merch_revenue_change, "
            "estimated_roi)"
        )
        text = await self._call(system, prompt)
        return _parse_json(text)

    async def translate_content(
        self, text: str, source_lang: str, target_langs: list[str], client=None
    ) -> dict[str, str]:
        system = _get_brand_system(client)
        langs_str = ", ".join(target_langs)
        prompt = (
            f"Translate the following {source_lang} social media caption into: {langs_str}.\n"
            "Keep the same tone, emojis, and hashtags. Adapt culturally where needed.\n\n"
            f"Text:\n{text}\n\n"
            f"Return JSON object with keys: {langs_str}. "
            "Each value is the translated string."
        )
        text_resp = await self._call(system, prompt, max_tokens=2048)
        return _parse_json(text_resp)
