"""Market-analysis schemas for the Dinamo Zagreb Marketing Platform API."""

from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CountryOut(BaseModel):
    """Read-only representation of a target country / market."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str = Field(description="ISO 3166-1 alpha-2 country code")
    region_type: Optional[str] = Field(default=None, description="Geographic region category")
    population: Optional[int] = Field(default=None, ge=0)
    internet_penetration: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="Fraction of population online"
    )
    football_popularity_index: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="Normalised football-interest score"
    )


class MarketScoreOut(BaseModel):
    """Composite market-attractiveness score for a country."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    country_id: UUID
    country_name: str
    sports_density_score: float = Field(ge=0.0)
    audience_score: float = Field(ge=0.0)
    diaspora_score: float = Field(ge=0.0)
    search_score: float = Field(ge=0.0)
    social_penetration_score: float = Field(ge=0.0)
    total_score: float = Field(ge=0.0)
    rank: int = Field(ge=1)
    scan_date: date


class ScanRequest(BaseModel):
    """Optional weight overrides when triggering a market scan."""

    model_config = ConfigDict(from_attributes=True)

    sports_density_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    audience_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    diaspora_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    search_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    social_penetration_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class ScanResponse(BaseModel):
    """Result envelope returned after a market scan completes."""

    model_config = ConfigDict(from_attributes=True)

    countries_scanned: int = Field(ge=0)
    scores: list[MarketScoreOut]
    top_markets: list[MarketScoreOut] = Field(
        description="Top-ranked markets from this scan"
    )
