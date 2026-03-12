"""Mock Buffer client returning realistic scheduled post data."""

from __future__ import annotations

from app.integrations.base import BufferClientBase


class BufferMockClient(BufferClientBase):
    """Returns hardcoded but realistic Buffer data for development."""

    is_mock = True

    async def health_check(self) -> dict:
        return {"status": "ok", "platform": "buffer", "mock": True}

    async def get_profiles(self) -> list[dict]:
        return [
            {
                "id": "buf_prof_ig_001",
                "service": "instagram",
                "service_username": "soz_official",
                "service_id": "ig_17841400001",
                "formatted_username": "@soz_official",
                "avatar_url": "https://buffer-media.com/avatars/soz_ig.jpg",
                "default": True,
                "schedules": [
                    {"day": "mon", "times": ["09:00", "12:00", "18:00"]},
                    {"day": "tue", "times": ["09:00", "12:00", "18:00"]},
                    {"day": "wed", "times": ["09:00", "12:00", "18:00"]},
                    {"day": "thu", "times": ["09:00", "12:00", "18:00"]},
                    {"day": "fri", "times": ["09:00", "12:00", "18:00"]},
                    {"day": "sat", "times": ["10:00", "15:00"]},
                    {"day": "sun", "times": ["10:00", "15:00"]},
                ],
            },
            {
                "id": "buf_prof_fb_001",
                "service": "facebook",
                "service_username": "SOZOfficialPage",
                "service_id": "fb_page_00123",
                "formatted_username": "ShiftOneZero Official",
                "avatar_url": "https://buffer-media.com/avatars/soz_fb.jpg",
                "default": False,
                "schedules": [
                    {"day": "mon", "times": ["10:00", "17:00"]},
                    {"day": "wed", "times": ["10:00", "17:00"]},
                    {"day": "fri", "times": ["10:00", "17:00"]},
                ],
            },
            {
                "id": "buf_prof_tw_001",
                "service": "twitter",
                "service_username": "ShiftOneZero",
                "service_id": "tw_928374650",
                "formatted_username": "@ShiftOneZero",
                "avatar_url": "https://buffer-media.com/avatars/soz_tw.jpg",
                "default": False,
                "schedules": [
                    {"day": "mon", "times": ["08:00", "12:00", "17:00", "20:00"]},
                    {"day": "tue", "times": ["08:00", "12:00", "17:00", "20:00"]},
                    {"day": "wed", "times": ["08:00", "12:00", "17:00", "20:00"]},
                    {"day": "thu", "times": ["08:00", "12:00", "17:00", "20:00"]},
                    {"day": "fri", "times": ["08:00", "12:00", "17:00", "20:00"]},
                    {"day": "sat", "times": ["10:00", "14:00", "19:00"]},
                    {"day": "sun", "times": ["10:00", "14:00", "19:00"]},
                ],
            },
            {
                "id": "buf_prof_li_001",
                "service": "linkedin",
                "service_username": "ShiftOneZero",
                "service_id": "li_company_12345",
                "formatted_username": "ShiftOneZero",
                "avatar_url": "https://buffer-media.com/avatars/soz_li.jpg",
                "default": False,
                "schedules": [
                    {"day": "tue", "times": ["09:00"]},
                    {"day": "thu", "times": ["09:00"]},
                ],
            },
        ]

    async def create_post(
        self,
        profile_ids: list[str],
        text: str,
        media: list[dict] | None = None,
        scheduled_at: str | None = None,
    ) -> dict:
        return {
            "success": True,
            "post_id": "buf_post_mock_88291",
            "status": "scheduled" if scheduled_at else "queued",
            "scheduled_at": scheduled_at,
            "profile_ids": profile_ids,
            "text": text,
            "media": media or [],
        }

    async def get_scheduled_posts(self, profile_id: str) -> list[dict]:
        return [
            {
                "id": "buf_post_001",
                "profile_id": profile_id,
                "text": "3 products, 1 unforgettable launch. Relive every moment from our spring reveal ⚽🔥\n\n#SOZ #DerbyDay #HNL",
                "status": "scheduled",
                "scheduled_at": "2026-03-05T17:00:00Z",
                "sent_at": None,
                "media": [
                    {
                        "photo": "https://buffer-media.com/uploads/launch_carousel_1.jpg",
                        "thumbnail": "https://buffer-media.com/uploads/launch_carousel_1_thumb.jpg",
                        "link": None,
                    }
                ],
                "created_at": "2026-03-05T09:30:00Z",
                "due_at": "2026-03-05T17:00:00Z",
                "statistics": {},
            },
            {
                "id": "buf_post_002",
                "profile_id": profile_id,
                "text": "5 days until we write the next chapter in our brand story 🌟\n\nSOZ vs AS Roma | Spring Campaign Launch Event\n\n#SOZ #EuropaLeague #UEL",
                "status": "scheduled",
                "scheduled_at": "2026-03-07T09:00:00Z",
                "sent_at": None,
                "media": [
                    {
                        "photo": "https://buffer-media.com/uploads/campaign_countdown_5.jpg",
                        "thumbnail": "https://buffer-media.com/uploads/campaign_countdown_5_thumb.jpg",
                        "link": None,
                    }
                ],
                "created_at": "2026-03-05T09:35:00Z",
                "due_at": "2026-03-07T09:00:00Z",
                "statistics": {},
            },
            {
                "id": "buf_post_003",
                "profile_id": profile_id,
                "text": "Locked in. Preparation is INTENSE ahead of next week's big launch event.\n\n#SOZ #Training #EuropaLeague #Roma",
                "status": "scheduled",
                "scheduled_at": "2026-03-09T16:00:00Z",
                "sent_at": None,
                "media": [],
                "created_at": "2026-03-05T09:40:00Z",
                "due_at": "2026-03-09T16:00:00Z",
                "statistics": {},
            },
            {
                "id": "buf_post_004",
                "profile_id": profile_id,
                "text": "LAUNCH DAY 🔵⚪\n\nSOZ vs AS ROMA\nSpring Campaign Launch Event\n18:00 CET | Flagship Store\n\nWho is joining us? 🙋‍♂️\n\n#SOZ #Roma #UEL #Matchday #Zagreb",
                "status": "scheduled",
                "scheduled_at": "2026-03-12T08:00:00Z",
                "sent_at": None,
                "media": [
                    {
                        "photo": "https://buffer-media.com/uploads/launchday_spring.jpg",
                        "thumbnail": "https://buffer-media.com/uploads/launchday_spring_thumb.jpg",
                        "link": None,
                    }
                ],
                "created_at": "2026-03-05T09:45:00Z",
                "due_at": "2026-03-12T08:00:00Z",
                "statistics": {},
            },
        ]
