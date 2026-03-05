"""Mock TikTok client returning realistic TikTok data."""

from __future__ import annotations

from app.integrations.base import TikTokClientBase


class TikTokMockClient(TikTokClientBase):
    """Returns hardcoded but realistic TikTok data for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "tiktok", "mock": True}

    async def get_account_info(self) -> dict:
        return {
            "open_id": "tiktok_mock_user_001",
            "union_id": "tiktok_union_001",
            "display_name": "DinamoOfficial",
            "avatar_url": "https://p16-sign.tiktokcdn.com/mock-avatar.jpg",
            "follower_count": 89_000,
            "following_count": 215,
            "likes_count": 2_100_000,
            "video_count": 342,
            "bio_description": "Official TikTok of Dinamo | Match highlights, behind the scenes & more",
            "is_verified": True,
        }

    async def get_video_list(self, limit: int = 20) -> list[dict]:
        videos = [
            {
                "id": "7321098765432100001",
                "title": "INCREDIBLE goal from last night! \u26bd\ud83d\udd25",
                "description": "What a strike! Our top scorer does it again #Dinamo #Goal #Football",
                "cover_image_url": "https://p16-sign.tiktokcdn.com/mock-cover-001.jpg",
                "share_url": "https://www.tiktok.com/@dinamoofficial/video/7321098765432100001",
                "create_time": 1709571600,
                "duration": 15,
                "like_count": 145_200,
                "comment_count": 3_420,
                "share_count": 12_800,
                "view_count": 1_850_000,
            },
            {
                "id": "7321098765432100002",
                "title": "POV: You're in the tunnel before the derby",
                "description": "The atmosphere is ELECTRIC \u26a1 #DerbyDay #Dinamo #Matchday",
                "cover_image_url": "https://p16-sign.tiktokcdn.com/mock-cover-002.jpg",
                "share_url": "https://www.tiktok.com/@dinamoofficial/video/7321098765432100002",
                "create_time": 1709485200,
                "duration": 22,
                "like_count": 98_700,
                "comment_count": 2_150,
                "share_count": 8_430,
                "view_count": 1_230_000,
            },
            {
                "id": "7321098765432100003",
                "title": "Players try to pronounce Croatian words \ud83d\ude02",
                "description": "This is TOO FUNNY! Wait for the last one #Funny #Football #Croatian",
                "cover_image_url": "https://p16-sign.tiktokcdn.com/mock-cover-003.jpg",
                "share_url": "https://www.tiktok.com/@dinamoofficial/video/7321098765432100003",
                "create_time": 1709398800,
                "duration": 45,
                "like_count": 234_500,
                "comment_count": 5_670,
                "share_count": 18_900,
                "view_count": 3_420_000,
            },
            {
                "id": "7321098765432100004",
                "title": "Training day with the squad \ud83d\udcaa",
                "description": "Hard work pays off #Training #Dinamo #BehindTheScenes",
                "cover_image_url": "https://p16-sign.tiktokcdn.com/mock-cover-004.jpg",
                "share_url": "https://www.tiktok.com/@dinamoofficial/video/7321098765432100004",
                "create_time": 1709312400,
                "duration": 30,
                "like_count": 67_300,
                "comment_count": 1_240,
                "share_count": 4_560,
                "view_count": 890_000,
            },
        ]
        return videos[:limit]

    async def get_video_insights(self, video_id: str) -> dict:
        return {
            "video_id": video_id,
            "total_views": 1_850_000,
            "total_likes": 145_200,
            "total_comments": 3_420,
            "total_shares": 12_800,
            "average_watch_time": 11.4,
            "full_video_watched_rate": 0.42,
            "reach": 1_620_000,
            "impression_sources": {
                "for_you_page": 72.3,
                "follow_page": 14.5,
                "hashtag": 8.2,
                "sound": 3.1,
                "other": 1.9,
            },
        }

    async def create_campaign(self, data: dict) -> dict:
        return {
            "campaign_id": "tt_camp_mock_89201",
            "campaign_name": data.get("campaign_name", "Mock TikTok Campaign"),
            "status": "CAMPAIGN_STATUS_DISABLE",
            "objective_type": data.get("objective_type", "TRAFFIC"),
            "budget": data.get("budget", 500.0),
            "budget_mode": data.get("budget_mode", "BUDGET_MODE_DAY"),
        }

    async def create_ad_group(self, data: dict) -> dict:
        return {
            "adgroup_id": "tt_adg_mock_37291",
            "campaign_id": data.get("campaign_id", "tt_camp_mock_89201"),
            "adgroup_name": data.get("adgroup_name", "Mock Ad Group"),
            "status": "ADGROUP_STATUS_DISABLE",
            "placement_type": "PLACEMENT_TYPE_AUTOMATIC",
            "budget": data.get("budget", 200.0),
        }

    async def create_ad(self, data: dict) -> dict:
        return {
            "ad_id": "tt_ad_mock_92817",
            "adgroup_id": data.get("adgroup_id", "tt_adg_mock_37291"),
            "ad_name": data.get("ad_name", "Mock TikTok Ad"),
            "status": "AD_STATUS_DISABLE",
            "ad_format": "SINGLE_VIDEO",
        }

    async def get_ad_insights(self, ad_id: str) -> dict:
        return {
            "ad_id": ad_id,
            "impressions": 312_000,
            "clicks": 8_750,
            "spend": 624.30,
            "cpc": 0.071,
            "cpm": 2.00,
            "ctr": 2.80,
            "conversions": 412,
            "cost_per_conversion": 1.52,
            "video_views_p25": 218_400,
            "video_views_p50": 156_000,
            "video_views_p75": 93_600,
            "video_views_p100": 62_400,
        }
