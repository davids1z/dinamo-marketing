"""Notification endpoint tests: get recent, mark read."""

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import test_session_factory
from app.models.notification import Notification


async def _seed_notification() -> str:
    async with test_session_factory() as session:
        notif = Notification(
            type="test",
            title="Test Alert",
            body="This is a test notification",
            severity="info",
        )
        session.add(notif)
        await session.commit()
        await session.refresh(notif)
        return str(notif.id)


@pytest.mark.asyncio
async def test_get_recent_notifications(client: AsyncClient, admin_user, auth_headers):
    notif_id = await _seed_notification()
    response = await client.get("/api/v1/settings/notifications/recent", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(n["id"] == notif_id for n in data)


@pytest.mark.asyncio
async def test_mark_notification_read(client: AsyncClient, admin_user, auth_headers):
    notif_id = await _seed_notification()
    response = await client.put(
        f"/api/v1/settings/notifications/{notif_id}/read",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_mark_nonexistent_notification(client: AsyncClient, admin_user, auth_headers):
    fake_id = str(uuid.uuid4())
    response = await client.put(
        f"/api/v1/settings/notifications/{fake_id}/read",
        headers=auth_headers,
    )
    assert response.status_code == 404
