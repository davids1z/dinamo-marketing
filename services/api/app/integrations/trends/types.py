from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class InterestByRegionEntry(TypedDict):
    geo_name: str
    geo_code: str
    value: int
    keyword: str


class InterestOverTimeEntry(TypedDict):
    date: str
    values: dict[str, int]
    is_partial: bool


class TrendsResult(TypedDict):
    keywords: list[str]
    geo: str
    timeframe: str
    data: list[dict]


class RelatedQuery(TypedDict):
    query: str
    value: int | str
    link: str


class RelatedTopic(TypedDict):
    title: str
    topic_type: str
    value: int | str


@dataclass
class TrendsRequest:
    keywords: list[str] = field(default_factory=list)
    geo: str = ""
    timeframe: str = "today 12-m"
    category: int = 0
    property: str = ""
