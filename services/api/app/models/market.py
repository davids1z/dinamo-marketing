"""Modul 1: Market Intelligence Scanner models."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Country(BaseModel):
    __tablename__ = "countries"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(3), nullable=False, unique=True)
    region_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # regional, diaspora, expansion
    population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    internet_penetration: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    football_popularity_index: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Relationships
    sports_events: Mapped[list["SportEvent"]] = relationship(back_populates="country")
    market_audiences: Mapped[list["MarketAudience"]] = relationship(back_populates="country")
    diaspora_data: Mapped[list["DiasporaData"]] = relationship(back_populates="country")
    search_trends: Mapped[list["SearchTrend"]] = relationship(back_populates="country")
    market_scores: Mapped[list["MarketScore"]] = relationship(back_populates="country")


class SportEvent(BaseModel):
    __tablename__ = "sports_events"

    country_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False
    )
    sport: Mapped[str] = mapped_column(String(50), nullable=False)
    league_name: Mapped[str] = mapped_column(String(200), nullable=False)
    events_per_year: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_attendance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    media_coverage_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    country: Mapped["Country"] = relationship(back_populates="sports_events")


class MarketAudience(BaseModel):
    __tablename__ = "market_audiences"

    country_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False
    )
    football_interest_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    age_18_24: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    age_25_34: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    age_35_44: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    age_45_plus: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    mobile_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    desktop_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    country: Mapped["Country"] = relationship(back_populates="market_audiences")


class DiasporaData(BaseModel):
    __tablename__ = "diaspora_data"

    country_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False
    )
    croatian_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    city_concentrations: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    year: Mapped[int] = mapped_column(Integer, nullable=False, default=2024)

    country: Mapped["Country"] = relationship(back_populates="diaspora_data")


class SearchTrend(BaseModel):
    __tablename__ = "search_trends"

    country_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False
    )
    keyword: Mapped[str] = mapped_column(String(200), nullable=False)
    score_normalized: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    country: Mapped["Country"] = relationship(back_populates="search_trends")


class MarketScore(BaseModel):
    __tablename__ = "market_scores"

    country_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False
    )
    sports_density_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    audience_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    diaspora_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    search_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    social_penetration_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scan_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    country: Mapped["Country"] = relationship(back_populates="market_scores")
