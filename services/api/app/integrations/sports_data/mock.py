"""Mock sports data client returning realistic football league and match data."""

from __future__ import annotations

from app.integrations.base import SportsDataClientBase


class SportsDataMockClient(SportsDataClientBase):
    """Returns hardcoded but realistic sports data for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "sports_data", "mock": True}

    async def get_leagues_by_country(self, country_code: str) -> list[dict]:
        leagues_db: dict[str, list[dict]] = {
            "HR": [
                {
                    "league_id": "210",
                    "name": "HNL - Prva liga",
                    "country": "Croatia",
                    "country_code": "HR",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/210.png",
                    "tier": 1,
                },
                {
                    "league_id": "211",
                    "name": "Druga HNL",
                    "country": "Croatia",
                    "country_code": "HR",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/211.png",
                    "tier": 2,
                },
                {
                    "league_id": "655",
                    "name": "Hrvatski kup",
                    "country": "Croatia",
                    "country_code": "HR",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/655.png",
                    "tier": 0,
                },
            ],
            "ES": [
                {
                    "league_id": "140",
                    "name": "La Liga",
                    "country": "Spain",
                    "country_code": "ES",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/140.png",
                    "tier": 1,
                },
                {
                    "league_id": "141",
                    "name": "Segunda Division",
                    "country": "Spain",
                    "country_code": "ES",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/141.png",
                    "tier": 2,
                },
            ],
            "GB": [
                {
                    "league_id": "39",
                    "name": "Premier League",
                    "country": "England",
                    "country_code": "GB",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/39.png",
                    "tier": 1,
                },
                {
                    "league_id": "40",
                    "name": "Championship",
                    "country": "England",
                    "country_code": "GB",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/40.png",
                    "tier": 2,
                },
            ],
            "DE": [
                {
                    "league_id": "78",
                    "name": "Bundesliga",
                    "country": "Germany",
                    "country_code": "DE",
                    "season": "2025-2026",
                    "logo_url": "https://media.api-sports.io/football/leagues/78.png",
                    "tier": 1,
                },
            ],
        }
        return leagues_db.get(country_code, [])

    async def get_events_by_league(self, league_id: str, season: str) -> list[dict]:
        return [
            {
                "event_id": "evt_100201",
                "league_id": league_id,
                "home_team": "Dinamo Zagreb",
                "away_team": "Hajduk Split",
                "home_team_id": "team_dinamo",
                "away_team_id": "team_hajduk",
                "date": "2026-03-04",
                "time": "20:00",
                "status": "FT",
                "home_score": 3,
                "away_score": 1,
                "venue": "Stadion Maksimir",
                "round": "Round 24",
            },
            {
                "event_id": "evt_100202",
                "league_id": league_id,
                "home_team": "Rijeka",
                "away_team": "Osijek",
                "home_team_id": "team_rijeka",
                "away_team_id": "team_osijek",
                "date": "2026-03-04",
                "time": "17:30",
                "status": "FT",
                "home_score": 2,
                "away_score": 2,
                "venue": "Stadion Rujevica",
                "round": "Round 24",
            },
            {
                "event_id": "evt_100203",
                "league_id": league_id,
                "home_team": "Lokomotiva",
                "away_team": "Slaven Belupo",
                "home_team_id": "team_lokomotiva",
                "away_team_id": "team_slaven",
                "date": "2026-03-05",
                "time": "15:00",
                "status": "NS",
                "home_score": None,
                "away_score": None,
                "venue": "Stadion Kranjceviceva",
                "round": "Round 24",
            },
        ]

    async def get_team_info(self, team_name: str) -> dict:
        return {
            "team_id": "team_dinamo",
            "name": "GNK Dinamo Zagreb",
            "short_name": "Dinamo",
            "country": "Croatia",
            "founded": 1911,
            "venue": "Stadion Maksimir",
            "venue_capacity": 35_123,
            "logo_url": "https://media.api-sports.io/football/teams/dinamo.png",
            "league": "HNL - Prva liga",
        }

    async def get_upcoming_events(self, team_id: str) -> list[dict]:
        return [
            {
                "event_id": "evt_100301",
                "league_id": "210",
                "home_team": "Istra 1961",
                "away_team": "Dinamo Zagreb",
                "home_team_id": "team_istra",
                "away_team_id": team_id,
                "date": "2026-03-08",
                "time": "17:30",
                "status": "NS",
                "home_score": None,
                "away_score": None,
                "venue": "Stadion Aldo Drosina",
                "round": "Round 25",
            },
            {
                "event_id": "evt_100302",
                "league_id": "2",
                "home_team": "Dinamo Zagreb",
                "away_team": "AS Roma",
                "home_team_id": team_id,
                "away_team_id": "team_roma",
                "date": "2026-03-12",
                "time": "21:00",
                "status": "NS",
                "home_score": None,
                "away_score": None,
                "venue": "Stadion Maksimir",
                "round": "Quarter-final 1st Leg",
            },
            {
                "event_id": "evt_100303",
                "league_id": "210",
                "home_team": "Dinamo Zagreb",
                "away_team": "Rijeka",
                "home_team_id": team_id,
                "away_team_id": "team_rijeka",
                "date": "2026-03-15",
                "time": "20:00",
                "status": "NS",
                "home_score": None,
                "away_score": None,
                "venue": "Stadion Maksimir",
                "round": "Round 26",
            },
        ]
