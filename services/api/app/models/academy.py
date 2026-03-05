"""Modul 12: Academy Content Factory models."""

from datetime import date

from sqlalchemy import Boolean, Date, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AcademyPlayer(BaseModel):
    __tablename__ = "academy_players"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    birth_year: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[str] = mapped_column(String(30), nullable=False)
    team_level: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # U15, U17, U19, first_team
    joined_date: Mapped[date] = mapped_column(Date, nullable=False)
    stats: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)


class AcademyMatch(BaseModel):
    __tablename__ = "academy_matches"

    opponent: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    team_level: Mapped[str] = mapped_column(String(30), nullable=False, default="U19")
    result: Mapped[str] = mapped_column(String(20), nullable=False, default="")  # "3-1"
    scorers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    highlights: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class AcademyStat(BaseModel):
    __tablename__ = "academy_stats"

    period: Mapped[str] = mapped_column(String(20), nullable=False)  # "2024-25"
    players_promoted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    players_sold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    transfer_revenue: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    active_camps: Mapped[dict | None] = mapped_column(JSON, nullable=True)
