"""Real Claude (Anthropic) API client for AI-powered content generation.

Requires a valid Anthropic API key.
"""

from __future__ import annotations

from app.integrations.base import ClaudeClientBase


class ClaudeClient(ClaudeClientBase):
    """Production Anthropic Claude API client."""

    def __init__(self, api_key: str, model: str = "claude-opus-4-6"):
        self._api_key = api_key
        self._model = model
        self._base_url = "https://api.anthropic.com/v1"

    async def health_check(self) -> dict:
        raise NotImplementedError(
            "ClaudeClient.health_check requires a valid Anthropic API key. "
            "Set ANTHROPIC_API_KEY in your environment."
        )

    async def generate_content_plan(self, context: dict) -> dict:
        raise NotImplementedError(
            "ClaudeClient.generate_content_plan requires a valid Anthropic API key."
        )

    async def generate_post_copy(self, brief: dict) -> dict:
        raise NotImplementedError(
            "ClaudeClient.generate_post_copy requires a valid Anthropic API key."
        )

    async def generate_ab_variants(self, base_copy: str, num_variants: int = 3) -> list[dict]:
        raise NotImplementedError(
            "ClaudeClient.generate_ab_variants requires a valid Anthropic API key."
        )

    async def analyze_sentiment(self, texts: list[str]) -> list[dict]:
        raise NotImplementedError(
            "ClaudeClient.analyze_sentiment requires a valid Anthropic API key."
        )

    async def generate_report_summary(self, data: dict) -> str:
        raise NotImplementedError(
            "ClaudeClient.generate_report_summary requires a valid Anthropic API key."
        )

    async def generate_strategy_recommendation(self, performance_data: dict) -> dict:
        raise NotImplementedError(
            "ClaudeClient.generate_strategy_recommendation requires a valid Anthropic API key."
        )
