"""Mock YouTube client returning realistic channel and video data."""

from __future__ import annotations

from app.integrations.base import YouTubeClientBase


class YouTubeMockClient(YouTubeClientBase):
    """Returns hardcoded but realistic YouTube data for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "youtube", "mock": True}

    async def get_channel_stats(self, channel_id: str) -> dict:
        return {
            "channel_id": channel_id,
            "title": "Dinamo Official",
            "description": "Official YouTube channel of Dinamo. Match highlights, interviews, behind the scenes and more.",
            "subscriber_count": 145_000,
            "video_count": 1_284,
            "view_count": 48_750_000,
            "custom_url": "@DinamoOfficial",
            "thumbnail_url": "https://yt3.ggpht.com/mock-channel-thumb.jpg",
            "published_at": "2012-06-15T08:00:00Z",
        }

    async def get_recent_videos(self, channel_id: str, limit: int = 10) -> list[dict]:
        videos = [
            {
                "video_id": "dQw4w9WgXcQ_mock01",
                "title": "MATCH HIGHLIGHTS | Dinamo 3-1 Hajduk | Derby Day!",
                "description": "Full highlights from the thrilling derby match. Goals from Petkovic (12', 67') and Misic (45+2')",
                "published_at": "2026-03-04T20:00:00Z",
                "thumbnail_url": "https://i.ytimg.com/vi/mock01/maxresdefault.jpg",
                "duration": "PT10M32S",
                "view_count": 87_500,
                "like_count": 4_230,
                "comment_count": 892,
                "tags": ["dinamo", "highlights", "derby", "football", "hnl"],
            },
            {
                "video_id": "dQw4w9WgXcQ_mock02",
                "title": "POST-MATCH | Manager's reaction to derby victory",
                "description": "The gaffer shares his thoughts after an incredible derby performance.",
                "published_at": "2026-03-04T22:30:00Z",
                "thumbnail_url": "https://i.ytimg.com/vi/mock02/maxresdefault.jpg",
                "duration": "PT6M14S",
                "view_count": 32_100,
                "like_count": 1_870,
                "comment_count": 345,
                "tags": ["dinamo", "interview", "manager", "derby"],
            },
            {
                "video_id": "dQw4w9WgXcQ_mock03",
                "title": "BEHIND THE SCENES | Matchday experience from the inside",
                "description": "Go behind the scenes on matchday: from the dressing room to the final whistle.",
                "published_at": "2026-03-03T14:00:00Z",
                "thumbnail_url": "https://i.ytimg.com/vi/mock03/maxresdefault.jpg",
                "duration": "PT14M48S",
                "view_count": 25_400,
                "like_count": 2_100,
                "comment_count": 267,
                "tags": ["dinamo", "behind the scenes", "matchday", "vlog"],
            },
            {
                "video_id": "dQw4w9WgXcQ_mock04",
                "title": "TOP 10 GOALS | February 2026",
                "description": "The best goals scored by Dinamo in February 2026. Which one is your favourite?",
                "published_at": "2026-03-01T12:00:00Z",
                "thumbnail_url": "https://i.ytimg.com/vi/mock04/maxresdefault.jpg",
                "duration": "PT8M22S",
                "view_count": 41_200,
                "like_count": 3_450,
                "comment_count": 521,
                "tags": ["dinamo", "top 10", "goals", "compilation"],
            },
            {
                "video_id": "dQw4w9WgXcQ_mock05",
                "title": "TRAINING | Preparing for the Europa League quarter-final",
                "description": "The squad trains ahead of Thursday's big European night under the lights.",
                "published_at": "2026-02-28T16:00:00Z",
                "thumbnail_url": "https://i.ytimg.com/vi/mock05/maxresdefault.jpg",
                "duration": "PT5M10S",
                "view_count": 18_700,
                "like_count": 1_320,
                "comment_count": 198,
                "tags": ["dinamo", "training", "europa league", "football"],
            },
        ]
        return videos[:limit]

    async def get_video_stats(self, video_id: str) -> dict:
        return {
            "video_id": video_id,
            "view_count": 87_500,
            "like_count": 4_230,
            "comment_count": 892,
            "favorite_count": 0,
            "average_view_duration": "PT5M12S",
            "average_view_percentage": 49.3,
            "estimated_minutes_watched": 453_750,
            "card_click_rate": 1.8,
            "annotation_click_through_rate": 0.0,
        }

    async def upload_video(self, video_path: str, title: str, description: str, tags: list[str] | None = None, privacy: str = "public") -> dict:
        return {
            "id": "yt_mock_video_dQw4w9WgXcQ_new01",
            "title": title,
            "description": description,
            "url": "https://www.youtube.com/watch?v=yt_mock_video_new01",
            "status": "public",
            "success": True,
        }

    async def upload_short(self, video_path: str, title: str, description: str) -> dict:
        return {
            "id": "yt_mock_short_dQw4w9WgXcQ_new02",
            "title": f"{title} #Shorts",
            "description": description,
            "url": "https://www.youtube.com/shorts/yt_mock_short_new02",
            "status": "public",
            "success": True,
        }

    async def get_audience_demographics(self, channel_id: str) -> dict:
        return {
            "channel_id": channel_id,
            "age_group": {
                "13-17": 8.2,
                "18-24": 24.5,
                "25-34": 31.2,
                "35-44": 18.7,
                "45-54": 10.3,
                "55-64": 4.8,
                "65+": 2.3,
            },
            "gender": {
                "male": 74.5,
                "female": 22.8,
                "other": 2.7,
            },
            "country": {
                "HR": 38.2,
                "BA": 11.5,
                "RS": 9.1,
                "DE": 8.4,
                "AT": 5.7,
                "US": 4.2,
                "SI": 3.8,
                "GB": 3.1,
                "other": 16.0,
            },
            "device_type": {
                "mobile": 62.3,
                "desktop": 24.1,
                "tablet": 7.8,
                "tv": 5.8,
            },
            "traffic_source": {
                "browse_features": 32.4,
                "suggested_videos": 28.1,
                "youtube_search": 18.7,
                "external": 12.3,
                "direct_or_unknown": 5.2,
                "channel_pages": 3.3,
            },
        }
