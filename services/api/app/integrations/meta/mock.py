"""Mock Meta client returning realistic Instagram / Facebook data."""

from __future__ import annotations

from app.integrations.base import MetaClientBase


class MetaMockClient(MetaClientBase):
    """Returns hardcoded but realistic Meta platform data for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "meta", "mock": True}

    # ------------------------------------------------------------------
    # Page / Instagram insights
    # ------------------------------------------------------------------

    async def get_page_insights(self, page_id: str, metrics: list[str], period: str = "day") -> dict:
        return {
            "page_id": page_id,
            "period": period,
            "data": [
                {
                    "name": "page_impressions",
                    "period": period,
                    "values": [
                        {"value": 48720, "end_time": "2026-03-04T08:00:00+0000"},
                        {"value": 51340, "end_time": "2026-03-05T08:00:00+0000"},
                    ],
                },
                {
                    "name": "page_engaged_users",
                    "period": period,
                    "values": [
                        {"value": 3215, "end_time": "2026-03-04T08:00:00+0000"},
                        {"value": 3580, "end_time": "2026-03-05T08:00:00+0000"},
                    ],
                },
                {
                    "name": "page_fans",
                    "period": period,
                    "values": [
                        {"value": 567000, "end_time": "2026-03-04T08:00:00+0000"},
                        {"value": 567420, "end_time": "2026-03-05T08:00:00+0000"},
                    ],
                },
            ],
        }

    async def get_instagram_insights(self, account_id: str, metrics: list[str]) -> dict:
        return {
            "account_id": account_id,
            "data": {
                "followers_count": 567000,
                "follows_count": 1243,
                "media_count": 1872,
                "impressions": 1_245_000,
                "reach": 15_000,
                "engagement_rate": 2.8,
                "profile_views": 32_450,
                "website_clicks": 4_120,
            },
        }

    async def get_instagram_media(self, account_id: str, limit: int = 25) -> list[dict]:
        return [
            {
                "id": "17895695012345678",
                "caption": "Game day vibes! Who's ready for tonight? \u26bd\ufe0f #Dinamo #MatchDay",
                "media_type": "IMAGE",
                "media_url": "https://scontent.example.com/v/t51.2885-15/img_001.jpg",
                "timestamp": "2026-03-04T14:30:00+0000",
                "like_count": 12480,
                "comments_count": 347,
                "permalink": "https://www.instagram.com/p/ABC123/",
            },
            {
                "id": "17895695012345679",
                "caption": "Behind the scenes at today's training session \ud83d\udcaa #TeamSpirit",
                "media_type": "CAROUSEL_ALBUM",
                "media_url": "https://scontent.example.com/v/t51.2885-15/img_002.jpg",
                "timestamp": "2026-03-03T11:00:00+0000",
                "like_count": 9870,
                "comments_count": 213,
                "permalink": "https://www.instagram.com/p/DEF456/",
            },
            {
                "id": "17895695012345680",
                "caption": "New merch drop \ud83d\udd25 Link in bio! #DinamoStyle",
                "media_type": "VIDEO",
                "media_url": "https://scontent.example.com/v/t51.2885-15/vid_003.mp4",
                "timestamp": "2026-03-02T16:45:00+0000",
                "like_count": 15320,
                "comments_count": 892,
                "permalink": "https://www.instagram.com/p/GHI789/",
            },
            {
                "id": "17895695012345681",
                "caption": "Throwback to that incredible goal last week \ud83c\udfaf #GoalOfTheWeek",
                "media_type": "VIDEO",
                "media_url": "https://scontent.example.com/v/t51.2885-15/vid_004.mp4",
                "timestamp": "2026-03-01T09:15:00+0000",
                "like_count": 22150,
                "comments_count": 1345,
                "permalink": "https://www.instagram.com/p/JKL012/",
            },
            {
                "id": "17895695012345682",
                "caption": "Fan of the match \u2764\ufe0f Thank you for your support!",
                "media_type": "IMAGE",
                "media_url": "https://scontent.example.com/v/t51.2885-15/img_005.jpg",
                "timestamp": "2026-02-28T20:00:00+0000",
                "like_count": 8420,
                "comments_count": 178,
                "permalink": "https://www.instagram.com/p/MNO345/",
            },
        ][:limit]

    async def get_audience_demographics(self, account_id: str) -> dict:
        return {
            "account_id": account_id,
            "age_gender": {
                "M.18-24": 18.5,
                "M.25-34": 26.3,
                "M.35-44": 14.2,
                "M.45-54": 6.1,
                "M.55-64": 2.3,
                "M.65+": 0.8,
                "F.18-24": 10.2,
                "F.25-34": 12.8,
                "F.35-44": 5.6,
                "F.45-54": 2.1,
                "F.55-64": 0.7,
                "F.65+": 0.4,
            },
            "country": {
                "HR": 42.5,
                "BA": 12.3,
                "RS": 8.7,
                "DE": 7.2,
                "AT": 5.1,
                "US": 4.8,
                "SI": 3.9,
                "GB": 3.2,
                "other": 12.3,
            },
            "city": {
                "Zagreb": 28.4,
                "Split": 6.2,
                "Rijeka": 4.1,
                "Osijek": 3.5,
                "Sarajevo": 3.2,
                "Vienna": 2.8,
                "Munich": 2.1,
                "other": 49.7,
            },
        }

    # ------------------------------------------------------------------
    # Ads management
    # ------------------------------------------------------------------

    async def create_campaign(self, ad_account_id: str, data: dict) -> dict:
        return {
            "id": "camp_mock_120392384",
            "name": data.get("name", "Mock Campaign"),
            "status": "PAUSED",
            "objective": data.get("objective", "REACH"),
            "ad_account_id": ad_account_id,
            "created_time": "2026-03-05T10:00:00+0000",
        }

    async def create_ad_set(self, ad_account_id: str, data: dict) -> dict:
        return {
            "id": "adset_mock_938471023",
            "name": data.get("name", "Mock Ad Set"),
            "campaign_id": data.get("campaign_id", "camp_mock_120392384"),
            "status": "PAUSED",
            "daily_budget": data.get("daily_budget", 5000),
            "targeting": data.get("targeting", {"geo_locations": {"countries": ["HR"]}}),
            "ad_account_id": ad_account_id,
        }

    async def create_ad(self, ad_account_id: str, data: dict) -> dict:
        return {
            "id": "ad_mock_472819305",
            "name": data.get("name", "Mock Ad"),
            "adset_id": data.get("adset_id", "adset_mock_938471023"),
            "status": "PAUSED",
            "creative": data.get("creative", {}),
            "ad_account_id": ad_account_id,
        }

    async def get_ad_insights(self, ad_id: str, fields: list[str]) -> dict:
        return {
            "ad_id": ad_id,
            "impressions": 124500,
            "clicks": 3890,
            "spend": 1245.67,
            "cpc": 0.32,
            "cpm": 10.00,
            "ctr": 3.12,
            "reach": 98200,
            "conversions": 187,
            "cost_per_conversion": 6.66,
            "date_start": "2026-02-01",
            "date_stop": "2026-03-04",
        }

    async def pause_ad(self, ad_id: str) -> dict:
        return {"ad_id": ad_id, "status": "PAUSED", "success": True}

    async def update_ad_budget(self, ad_set_id: str, new_budget: float) -> dict:
        return {
            "ad_set_id": ad_set_id,
            "daily_budget": new_budget,
            "previous_budget": 5000,
            "success": True,
        }
