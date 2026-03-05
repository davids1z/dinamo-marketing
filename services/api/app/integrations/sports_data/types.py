from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class League(TypedDict):
    league_id: str
    name: str
    country: str
    country_code: str
    season: str
    logo_url: str
    tier: int


class Team(TypedDict):
    team_id: str
    name: str
    short_name: str
    country: str
    founded: int
    venue: str
    venue_capacity: int
    logo_url: str
    league: str


class Event(TypedDict):
    event_id: str
    league_id: str
    home_team: str
    away_team: str
    home_team_id: str
    away_team_id: str
    date: str
    time: str
    status: str
    home_score: int | None
    away_score: int | None
    venue: str
    round: str


@dataclass
class Standing:
    position: int
    team_id: str
    team_name: str
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    goals_for: int = 0
    goals_against: int = 0
    goal_difference: int = 0
    points: int = 0


@dataclass
class PlayerStats:
    player_id: str = ""
    name: str = ""
    team: str = ""
    position: str = ""
    appearances: int = 0
    goals: int = 0
    assists: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    minutes_played: int = 0
