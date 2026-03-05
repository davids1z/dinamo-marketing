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
                "service_username": "dinamo_official",
                "service_id": "ig_17841400001",
                "formatted_username": "@dinamo_official",
                "avatar_url": "https://buffer-media.com/avatars/dinamo_ig.jpg",
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
                "service_username": "DinamoOfficialPage",
                "service_id": "fb_page_00123",
                "formatted_username": "Dinamo Official",
                "avatar_url": "https://buffer-media.com/avatars/dinamo_fb.jpg",
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
                "service_username": "DinamoZagreb",
                "service_id": "tw_928374650",
                "formatted_username": "@DinamoZagreb",
                "avatar_url": "https://buffer-media.com/avatars/dinamo_tw.jpg",
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
                "service_username": "GNK Dinamo Zagreb",
                "service_id": "li_company_12345",
                "formatted_username": "GNK Dinamo Zagreb",
                "avatar_url": "https://buffer-media.com/avatars/dinamo_li.jpg",
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
                "text": "3 goals, 1 unforgettable night. Relive every moment from the derby victory \u26bd\ud83d\udd25\n\n#Dinamo #DerbyDay #HNL",
                "status": "scheduled",
                "scheduled_at": "2026-03-05T17:00:00Z",
                "sent_at": None,
                "media": [
                    {
                        "photo": "https://buffer-media.com/uploads/derby_carousel_1.jpg",
                        "thumbnail": "https://buffer-media.com/uploads/derby_carousel_1_thumb.jpg",
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
                "text": "5 days until we write the next chapter in Europe \ud83c\udf1f\n\nDinamo vs AS Roma | Europa League Quarter-Final\n\n#Dinamo #EuropaLeague #UEL",
                "status": "scheduled",
                "scheduled_at": "2026-03-07T09:00:00Z",
                "sent_at": None,
                "media": [
                    {
                        "photo": "https://buffer-media.com/uploads/uel_countdown_5.jpg",
                        "thumbnail": "https://buffer-media.com/uploads/uel_countdown_5_thumb.jpg",
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
                "text": "Locked in \ud83d\udd12 Training is INTENSE ahead of Thursday's European clash \ud83d\udcaa\n\n#Dinamo #Training #EuropaLeague #Roma",
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
                "text": "MATCHDAY \ud83d\udd35\u26aa\n\nDINAMO vs AS ROMA\nEuropa League Quarter-Final\n21:00 CET | Stadion Maksimir\n\nWho's coming? \ud83d\ude4b\u200d\u2642\ufe0f\n\n#Dinamo #Roma #UEL #Matchday #Zagreb",
                "status": "scheduled",
                "scheduled_at": "2026-03-12T08:00:00Z",
                "sent_at": None,
                "media": [
                    {
                        "photo": "https://buffer-media.com/uploads/matchday_roma.jpg",
                        "thumbnail": "https://buffer-media.com/uploads/matchday_roma_thumb.jpg",
                        "link": None,
                    }
                ],
                "created_at": "2026-03-05T09:45:00Z",
                "due_at": "2026-03-12T08:00:00Z",
                "statistics": {},
            },
        ]
