from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict


class BufferProfile(TypedDict):
    id: str
    service: str
    service_username: str
    service_id: str
    formatted_username: str
    avatar_url: str
    default: bool
    schedules: list[dict]


class BufferPost(TypedDict):
    id: str
    profile_id: str
    text: str
    status: str
    scheduled_at: str | None
    sent_at: str | None
    media: list[dict]
    created_at: str
    due_at: str | None
    statistics: dict


class BufferPostMedia(TypedDict):
    photo: str
    thumbnail: str
    link: str | None


class BufferCreatePostResponse(TypedDict):
    success: bool
    post_id: str
    status: str
    scheduled_at: str | None
    profile_ids: list[str]


@dataclass
class BufferScheduleSlot:
    day: str
    times: list[str] = field(default_factory=list)
