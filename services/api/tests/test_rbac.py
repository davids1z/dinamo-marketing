"""
RBAC tests: verify that role-based access control is correctly enforced
across auth, client membership, and cross-client isolation.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client, UserClient
from app.models.project import Project
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_user(
    session: AsyncSession,
    email: str,
    role: str = "viewer",
    is_superadmin: bool = False,
    password: str = "Password1",
) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=f"Test {role}",
        role=role,
        is_active=True,
        is_superadmin=is_superadmin,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


async def _seed_client(session: AsyncSession, name: str = "Test Client") -> Client:
    client = Client(
        name=name,
        slug=name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:8],
        is_active=True,
        onboarding_completed=True,
    )
    session.add(client)
    await session.flush()
    await session.refresh(client)
    return client


async def _seed_project(session: AsyncSession, client: Client, name: str = "Test Project") -> Project:
    project = Project(
        client_id=client.id,
        name=name,
        slug=name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:8],
        is_active=True,
    )
    session.add(project)
    await session.flush()
    await session.refresh(project)
    return project


async def _seed_membership(
    session: AsyncSession,
    user: User,
    client: Client,
    role: str,
) -> UserClient:
    membership = UserClient(user_id=user.id, client_id=client.id, role=role)
    session.add(membership)
    await session.flush()
    return membership


def _token(user: User) -> str:
    return create_access_token(data={"sub": user.email, "role": user.role})


def _auth_headers(user: User, client: Client, project: Project | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {_token(user)}",
        "X-Client-ID": str(client.id),
    }
    if project:
        headers["X-Project-ID"] = str(project.id)
    return headers


# ---------------------------------------------------------------------------
# 1. Unauthenticated requests return 401 / 403
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unauthenticated_analytics_returns_401(client: AsyncClient):
    """No token at all — must get 401 or 403."""
    response = await client.get("/api/v1/analytics/overview")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_invalid_token_returns_401(client: AsyncClient):
    """Malformed JWT — must be rejected."""
    response = await client.get(
        "/api/v1/analytics/overview",
        headers={"Authorization": "Bearer this.is.garbage"},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_unauthenticated_clients_list_returns_401(client: AsyncClient):
    """Listing clients without auth is forbidden."""
    response = await client.get("/api/v1/clients/my/clients")
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 2. Valid user, no client membership
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_without_membership_gets_403(client: AsyncClient):
    """
    A valid user who has NO membership on the requested client must get 403.
    This tests the get_current_client dependency's membership check.
    """
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "nomember@test.com", "viewer")
        org = await _seed_client(session, "Org Alpha")
        project = await _seed_project(session, org)
        await session.commit()

    response = await client.get(
        "/api/v1/analytics/overview",
        headers=_auth_headers(user, org, project),
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# 3. Viewer can read, cannot write admin-gated routes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_viewer_can_read_analytics(client: AsyncClient):
    """Viewer role has read access to analytics endpoints."""
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "viewer@test.com", "viewer")
        org = await _seed_client(session, "Org Viewer")
        project = await _seed_project(session, org)
        await _seed_membership(session, user, org, "viewer")
        await session.commit()

    response = await client.get(
        "/api/v1/analytics/overview",
        headers=_auth_headers(user, org, project),
    )
    assert response.status_code not in (401, 403), (
        f"Viewer should be able to read analytics, got {response.status_code}"
    )


@pytest.mark.asyncio
async def test_viewer_cannot_invite_members(client: AsyncClient):
    """Viewer role must not be able to invite members (admin-only action)."""
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "viewer2@test.com", "viewer")
        org = await _seed_client(session, "Org ViewerInvite")
        project = await _seed_project(session, org)
        await _seed_membership(session, user, org, "viewer")
        await session.commit()

    response = await client.post(
        f"/api/v1/clients/{org.id}/members/invite",
        json={"email": "newperson@test.com", "role": "viewer"},
        headers=_auth_headers(user, org, project),
    )
    assert response.status_code == 403, (
        f"Viewer must not invite members, got {response.status_code}: {response.text}"
    )


@pytest.mark.asyncio
async def test_viewer_cannot_update_client_settings(client: AsyncClient):
    """Viewer role must not be able to modify client profile (admin-only action)."""
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "viewer3@test.com", "viewer")
        org = await _seed_client(session, "Org ViewerUpdate")
        project = await _seed_project(session, org)
        await _seed_membership(session, user, org, "viewer")
        await session.commit()

    response = await client.put(
        f"/api/v1/clients/{org.id}",
        json={"name": "Hacked Name", "business_description": "hacked"},
        headers=_auth_headers(user, org, project),
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# 4. Admin role can perform admin-gated actions on their client
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_can_update_client_settings(client: AsyncClient):
    """Admin role can update client profile."""
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "admin@test.com", "admin")
        org = await _seed_client(session, "Org Admin")
        project = await _seed_project(session, org)
        await _seed_membership(session, user, org, "admin")
        await session.commit()

    response = await client.put(
        f"/api/v1/clients/{org.id}",
        json={"name": "Updated Org Name", "business_description": "Updated desc"},
        headers=_auth_headers(user, org, project),
    )
    assert response.status_code in (200, 204), (
        f"Admin should update client, got {response.status_code}: {response.text}"
    )


# ---------------------------------------------------------------------------
# 5. Cross-client isolation — User A cannot access Client B's data
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cross_client_access_denied(client: AsyncClient):
    """
    User is a member of Client A but NOT Client B.
    Sending X-Client-ID for Client B must return 403.
    """
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "userA@test.com", "admin")
        client_a = await _seed_client(session, "Org ClientA")
        client_b = await _seed_client(session, "Org ClientB")
        project_b = await _seed_project(session, client_b)
        # User is member of A only
        await _seed_membership(session, user, client_a, "admin")
        await session.commit()

    # Attempt to access client B's analytics using user A's token
    response = await client.get(
        "/api/v1/analytics/overview",
        headers=_auth_headers(user, client_b, project_b),
    )
    assert response.status_code == 403, (
        f"Cross-client access must be denied, got {response.status_code}"
    )


@pytest.mark.asyncio
async def test_cross_client_member_invite_denied(client: AsyncClient):
    """
    Admin of Client A cannot invite members into Client B.
    """
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "adminA@test.com", "admin")
        client_a = await _seed_client(session, "Org A Invite")
        client_b = await _seed_client(session, "Org B Invite")
        project_b = await _seed_project(session, client_b)
        await _seed_membership(session, user, client_a, "admin")
        await session.commit()

    response = await client.post(
        f"/api/v1/clients/{client_b.id}/members/invite",
        json={"email": "victim@test.com", "role": "viewer"},
        headers=_auth_headers(user, client_b, project_b),
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# 6. Superadmin bypasses membership checks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_superadmin_can_access_any_client(client: AsyncClient):
    """Superadmin has no membership but can access any client."""
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        superadmin = await _seed_user(
            session, "superadmin@test.com", "admin", is_superadmin=True
        )
        org = await _seed_client(session, "Org SuperTest")
        project = await _seed_project(session, org)
        # NO membership added for superadmin
        await session.commit()

    response = await client.get(
        "/api/v1/analytics/overview",
        headers=_auth_headers(superadmin, org, project),
    )
    # Superadmin should not get 401 or 403
    assert response.status_code not in (401, 403), (
        f"Superadmin should bypass membership check, got {response.status_code}"
    )


# ---------------------------------------------------------------------------
# 7. Missing X-Client-ID header returns 400 (not 401)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_client_id_header_returns_400(client: AsyncClient, admin_user, auth_headers):
    """
    When a valid token is provided but X-Client-ID is missing,
    the dependency should return 422 (validation) or 400 (bad request).
    """
    response = await client.get(
        "/api/v1/analytics/overview",
        headers={"Authorization": auth_headers["Authorization"]},
    )
    # Missing required header → 422 Unprocessable Entity or 400 Bad Request
    assert response.status_code in (400, 422), (
        f"Missing X-Client-ID should fail validation, got {response.status_code}"
    )


# ---------------------------------------------------------------------------
# 8. Invalid UUID in X-Client-ID header
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invalid_client_id_uuid_returns_400(client: AsyncClient, admin_user, auth_headers):
    """Non-UUID X-Client-ID value must be rejected with 400."""
    response = await client.get(
        "/api/v1/analytics/overview",
        headers={
            **auth_headers,
            "X-Client-ID": "not-a-uuid",
        },
    )
    assert response.status_code == 400, (
        f"Invalid UUID in X-Client-ID should return 400, got {response.status_code}"
    )


# ---------------------------------------------------------------------------
# 9. Inactive user is rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inactive_user_cannot_authenticate(client: AsyncClient):
    """Deactivated user accounts must be rejected with 401."""
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = User(
            email="inactive@test.com",
            hashed_password=hash_password("Password1"),
            full_name="Inactive User",
            role="viewer",
            is_active=False,  # <-- deactivated
            is_superadmin=False,
        )
        session.add(user)
        await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@test.com", "password": "Password1"},
    )
    assert response.status_code in (401, 403), (
        f"Inactive user must be rejected, got {response.status_code}"
    )


# ---------------------------------------------------------------------------
# 10. Project isolation — project must belong to client
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_project_from_different_client_is_rejected(client: AsyncClient):
    """
    X-Project-ID that belongs to a different client than X-Client-ID must return 404.
    """
    from tests.conftest import test_session_factory

    async with test_session_factory() as session:
        user = await _seed_user(session, "proj_iso@test.com", "admin")
        client_a = await _seed_client(session, "Org ProjIso A")
        client_b = await _seed_client(session, "Org ProjIso B")
        project_b = await _seed_project(session, client_b)  # project belongs to B
        await _seed_membership(session, user, client_a, "admin")
        await _seed_membership(session, user, client_b, "admin")
        await session.commit()

    # User accesses client A but provides project B's ID.
    # /api/v1/content/posts uses get_current_project which validates that
    # the project belongs to the client in X-Client-ID — should 404.
    response = await client.get(
        "/api/v1/content/posts",
        headers={
            "Authorization": f"Bearer {_token(user)}",
            "X-Client-ID": str(client_a.id),
            "X-Project-ID": str(project_b.id),  # project belongs to client B, not A
        },
    )
    assert response.status_code == 404, (
        f"Project from different client must 404, got {response.status_code}: {response.text}"
    )
