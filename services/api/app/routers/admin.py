"""Admin router — user management + platform stats (superadmin-only)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_superadmin
from app.models.user import User
from app.services.auth_service import hash_password

router = APIRouter()

# Valid roles — matches frontend RBAC hierarchy
VALID_ROLES = {"superadmin", "admin", "moderator", "viewer"}
# Backward-compat mapping for old role values
_ROLE_MIGRATION = {"editor": "moderator"}


# ── Schemas ─────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login: str | None
    created_at: str

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "viewer"


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserListResponse(BaseModel):
    users: list[UserOut]
    total: int


# ── Helpers ─────────────────────────────────────────────────────────

def _user_to_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


# ── Endpoints ───────────────────────────────────────────────────────

@router.get("/users", response_model=UserListResponse)
async def list_users(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return {"users": [_user_to_dict(u) for u in users], "total": total}


@router.post("/users", status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Korisnik s tom email adresom već postoji",
        )

    # Normalize legacy role names
    role = _ROLE_MIGRATION.get(body.role, body.role)
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uloga mora biti: {', '.join(sorted(VALID_ROLES))}",
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_to_dict(user)


@router.put("/users/{user_id}")
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        role = _ROLE_MIGRATION.get(body.role, body.role)
        if role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uloga mora biti: {', '.join(sorted(VALID_ROLES))}",
            )
        user.role = role
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return _user_to_dict(user)


@router.get("/stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Return high-level platform statistics for superadmin dashboard."""
    from app.models.client import Client
    from app.models.project import Project
    from datetime import datetime, timezone, timedelta

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )).scalar() or 0
    total_clients = (await db.execute(select(func.count(Client.id)))).scalar() or 0
    total_projects = (await db.execute(select(func.count(Project.id)))).scalar() or 0

    # Users active today (logged in within last 24h)
    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    active_today = (await db.execute(
        select(func.count(User.id)).where(
            User.last_login != None,
            User.last_login >= yesterday,
        )
    )).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_clients": total_clients,
        "total_projects": total_projects,
        "active_today": active_today,
    }


@router.get("/clients")
async def list_all_clients(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """List all clients with member/project counts."""
    from app.models.client import Client, UserClient
    from app.models.project import Project

    total_result = await db.execute(select(func.count(Client.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Client).order_by(Client.created_at.desc()).offset(skip).limit(limit)
    )
    clients = result.scalars().all()

    items = []
    for c in clients:
        member_count = (await db.execute(
            select(func.count(UserClient.id)).where(UserClient.client_id == c.id)
        )).scalar() or 0
        project_count = (await db.execute(
            select(func.count(Project.id)).where(Project.client_id == c.id)
        )).scalar() or 0

        items.append({
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "is_active": c.is_active,
            "onboarding_completed": c.onboarding_completed,
            "member_count": member_count,
            "project_count": project_count,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        })

    return {"clients": items, "total": total}


@router.get("/users/{user_id}/detail")
async def user_detail(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Get user with all client memberships (for drill-down)."""
    from app.models.client import Client, UserClient

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    memberships_result = await db.execute(
        select(UserClient, Client)
        .join(Client, UserClient.client_id == Client.id)
        .where(UserClient.user_id == user_id)
        .order_by(Client.name)
    )
    memberships = [
        {
            "id": str(uc.id),
            "client_id": str(c.id),
            "client_name": c.name,
            "client_slug": c.slug,
            "role": uc.role,
        }
        for uc, c in memberships_result.all()
    ]

    return {
        **_user_to_dict(user),
        "is_superadmin": user.is_superadmin,
        "memberships": memberships,
    }


@router.get("/clients/{client_id}/detail")
async def client_detail(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Get client with members, projects, and brand profile (for drill-down)."""
    from app.models.client import Client, UserClient
    from app.models.project import Project

    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Klijent nije pronađen")

    # Members (exclude superadmins — they are above the client level)
    members_result = await db.execute(
        select(UserClient, User)
        .join(User, UserClient.user_id == User.id)
        .where(UserClient.client_id == client_id, User.is_superadmin == False)
        .order_by(User.full_name)
    )
    members = [
        {
            "membership_id": str(uc.id),
            "user_id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": uc.role,
            "is_active": u.is_active,
        }
        for uc, u in members_result.all()
    ]

    # Projects
    projects_result = await db.execute(
        select(Project).where(Project.client_id == client_id).order_by(Project.name)
    )
    projects = [
        {"id": str(p.id), "name": p.name, "slug": p.slug}
        for p in projects_result.scalars().all()
    ]

    return {
        "id": str(client.id),
        "name": client.name,
        "slug": client.slug,
        "is_active": client.is_active,
        "onboarding_completed": client.onboarding_completed,
        "created_at": client.created_at.isoformat() if client.created_at else "",
        "business_description": client.business_description,
        "tone_of_voice": client.tone_of_voice,
        "target_audience": client.target_audience,
        "logo_url": client.logo_url,
        "website_url": client.website_url,
        "members": members,
        "projects": projects,
    }


@router.put("/memberships/{membership_id}/role")
async def update_membership_role(
    membership_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Change a user's role on a specific client. Superadmin only."""
    from app.models.client import UserClient

    result = await db.execute(select(UserClient).where(UserClient.id == membership_id))
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Članstvo nije pronađeno")

    if body.role is None:
        raise HTTPException(status_code=400, detail="Polje 'role' je obavezno")

    role = _ROLE_MIGRATION.get(body.role, body.role)
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Uloga mora biti: {', '.join(sorted(VALID_ROLES))}",
        )

    membership.role = role
    await db.commit()
    return {"status": "updated", "role": role}


@router.delete("/memberships/{membership_id}")
async def delete_membership(
    membership_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    """Remove a user from a client. Superadmin only."""
    from app.models.client import UserClient

    result = await db.execute(select(UserClient).where(UserClient.id == membership_id))
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Članstvo nije pronađeno")

    await db.delete(membership)
    await db.commit()
    return {"status": "removed"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ne možete deaktivirati vlastiti račun",
        )

    user.is_active = False
    await db.commit()
    return {"status": "ok"}
