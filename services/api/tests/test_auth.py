"""Auth endpoint tests: login, /me, invalid credentials, protected routes."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@shiftonezero.com",
        "password": "shiftonezero2026",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@shiftonezero.com"
    assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@shiftonezero.com",
        "password": "wrong",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "email": "nobody@shiftonezero.com",
        "password": "anything",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, admin_user, auth_headers):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@shiftonezero.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me", headers={
        "Authorization": "Bearer invalid.token.here"
    })
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_protected_endpoint_no_auth(client: AsyncClient):
    response = await client.get("/api/v1/analytics/overview")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_protected_endpoint_with_auth(client: AsyncClient, admin_user, auth_headers):
    response = await client.get("/api/v1/analytics/overview", headers=auth_headers)
    assert response.status_code not in (401, 403)
