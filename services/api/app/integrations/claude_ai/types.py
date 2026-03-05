from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class ContentPlanItem(TypedDict):
    date: str
    platform: str
    content_type: str
    topic: str
    caption: str
    hashtags: list[str]
    best_time_to_post: str
    visual_direction: str


class ContentPlan(TypedDict):
    plan_id: str
    period: str
    theme: str
    items: list[ContentPlanItem]
    strategy_notes: str


class PostCopy(TypedDict):
    headline: str
    body: str
    call_to_action: str
    hashtags: list[str]
    platform: str
    tone: str
    estimated_engagement: str


class ABVariant(TypedDict):
    variant_id: str
    label: str
    copy: str
    rationale: str
    predicted_ctr: float


class SentimentResult(TypedDict):
    text: str
    sentiment: str
    confidence: float
    key_phrases: list[str]
    emotion: str


class StrategyRecommendation(TypedDict):
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    opportunities: list[str]
    recommended_actions: list[dict]
    projected_impact: dict


@dataclass
class GenerationMetadata:
    model: str = "claude-opus-4-6"
    tokens_used: int = 0
    latency_ms: float = 0.0
    cached: bool = False
