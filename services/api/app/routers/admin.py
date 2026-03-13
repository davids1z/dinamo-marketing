"""Admin router — user management, client management, audit log, impersonation (superadmin-only)."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_superadmin
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password
from app.services.audit_service import log_action

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


class SubscriptionUpdate(BaseModel):
    plan: str | None = None
    plan_expires_at: str | None = None  # ISO datetime or null
    ai_credits_total: int | None = None
    ai_credits_used: int | None = None


# ── Helpers ─────────────────────────────────────────────────────────

def _user_to_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_superadmin": user.is_superadmin,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


# ── Endpoints ───────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """List all users with client_count."""
    from app.models.client import UserClient

    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()

    # Get client counts for all users in one query
    user_ids = [u.id for u in users]
    if user_ids:
        counts_result = await db.execute(
            select(UserClient.user_id, func.count(UserClient.id))
            .where(UserClient.user_id.in_(user_ids))
            .group_by(UserClient.user_id)
        )
        client_counts = {row[0]: row[1] for row in counts_result.all()}
    else:
        client_counts = {}

    items = []
    for u in users:
        d = _user_to_dict(u)
        d["client_count"] = client_counts.get(u.id, 0)
        items.append(d)

    return {"users": items, "total": total}


@router.post("/users", status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin),
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
    await db.flush()

    await log_action(db, admin, "user.create", "user", user.id, {
        "email": body.email, "full_name": body.full_name, "role": role,
    })
    await db.commit()
    await db.refresh(user)
    return _user_to_dict(user)


@router.put("/users/{user_id}")
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    changes = {}
    if body.full_name is not None:
        changes["full_name"] = {"old": user.full_name, "new": body.full_name}
        user.full_name = body.full_name
    if body.role is not None:
        role = _ROLE_MIGRATION.get(body.role, body.role)
        if role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uloga mora biti: {', '.join(sorted(VALID_ROLES))}",
            )
        changes["role"] = {"old": user.role, "new": role}
        user.role = role
    if body.is_active is not None:
        changes["is_active"] = {"old": user.is_active, "new": body.is_active}
        user.is_active = body.is_active

    await log_action(db, admin, "user.update", "user", user.id, changes)
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
    """List all clients with member/project counts, primary admin, and subscription info."""
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
        # Member count (exclude superadmins)
        member_count = (await db.execute(
            select(func.count(UserClient.id))
            .join(User, UserClient.user_id == User.id)
            .where(UserClient.client_id == c.id, User.is_superadmin == False)
        )).scalar() or 0

        project_count = (await db.execute(
            select(func.count(Project.id)).where(Project.client_id == c.id)
        )).scalar() or 0

        # Primary admin: first user with role="admin" on this client
        primary_admin_result = await db.execute(
            select(User.full_name)
            .join(UserClient, UserClient.user_id == User.id)
            .where(
                UserClient.client_id == c.id,
                UserClient.role == "admin",
                User.is_superadmin == False,
            )
            .order_by(UserClient.created_at.asc())
            .limit(1)
        )
        primary_admin_name = primary_admin_result.scalar_one_or_none()

        items.append({
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "is_active": c.is_active,
            "onboarding_completed": c.onboarding_completed,
            "member_count": member_count,
            "project_count": project_count,
            "primary_admin_name": primary_admin_name,
            "plan": c.plan,
            "ai_credits_used": c.ai_credits_used,
            "ai_credits_total": c.ai_credits_total,
            "plan_expires_at": c.plan_expires_at.isoformat() if c.plan_expires_at else None,
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
    """Get client with members, projects, brand profile, and subscription (for drill-down)."""
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
        "plan": client.plan,
        "plan_expires_at": client.plan_expires_at.isoformat() if client.plan_expires_at else None,
        "ai_credits_total": client.ai_credits_total,
        "ai_credits_used": client.ai_credits_used,
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
    admin: User = Depends(require_superadmin),
):
    """Change a user's role on a specific client. Superadmin only."""
    from app.models.client import UserClient

    result = await db.execute(select(UserClient).where(UserClient.id == membership_id))
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Članstvo nije pronađeno")

    if body.role is None:
        raise HTTPException(status_code=400, detail="Polje 'role' je obavezno")

    old_role = membership.role
    role = _ROLE_MIGRATION.get(body.role, body.role)
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Uloga mora biti: {', '.join(sorted(VALID_ROLES))}",
        )

    membership.role = role
    await log_action(db, admin, "membership.role_change", "membership", membership.id, {
        "old_role": old_role, "new_role": role,
        "user_id": str(membership.user_id), "client_id": str(membership.client_id),
    })
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

    await log_action(db, admin, "membership.remove", "membership", membership.id, {
        "user_id": str(membership.user_id), "client_id": str(membership.client_id),
        "role": membership.role,
    })
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
    await log_action(db, admin, "user.deactivate", "user", user.id, {
        "email": user.email, "full_name": user.full_name,
    })
    await db.commit()
    return {"status": "ok"}


# ── Impersonation ────────────────────────────────────────────────────

@router.post("/impersonate/{user_id}")
async def impersonate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    """Generate a short-lived JWT token for another user (impersonation)."""
    from app.models.client import Client, UserClient
    from app.models.project import Project

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Ne možete impersonirati neaktivnog korisnika")

    if user.is_superadmin:
        raise HTTPException(status_code=400, detail="Ne možete impersonirati drugog superadmina")

    # Generate short-lived token (1 hour)
    token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "impersonated_by": admin.email,
        },
        expires_delta=timedelta(hours=1),
    )

    # Load user's client memberships for the response
    memberships_result = await db.execute(
        select(UserClient, Client)
        .join(Client, UserClient.client_id == Client.id)
        .where(UserClient.user_id == user.id, Client.is_active == True)
    )
    memberships = memberships_result.all()

    client_ids = [uc.client_id for uc, c in memberships]
    projects_by_client: dict[str, list] = {}
    if client_ids:
        projects_result = await db.execute(
            select(Project)
            .where(Project.client_id.in_(client_ids), Project.is_active == True)
            .order_by(Project.name)
        )
        for p in projects_result.scalars().all():
            cid = str(p.client_id)
            projects_by_client.setdefault(cid, []).append({
                "project_id": str(p.id),
                "project_name": p.name,
                "project_slug": p.slug,
            })

    clients = [
        {
            "client_id": str(uc.client_id),
            "client_name": c.name,
            "client_slug": c.slug,
            "client_logo_url": c.logo_url,
            "role": uc.role,
            "onboarding_completed": c.onboarding_completed,
            "projects": projects_by_client.get(str(uc.client_id), []),
        }
        for uc, c in memberships
    ]

    await log_action(db, admin, "user.impersonate", "user", user.id, {
        "target_email": user.email,
        "target_name": user.full_name,
    })
    await db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_superadmin": user.is_superadmin,
            "is_active": user.is_active,
            "clients": clients,
        },
    }


# ── Subscription Management ─────────────────────────────────────────

@router.put("/clients/{client_id}/subscription")
async def update_subscription(
    client_id: UUID,
    body: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_superadmin),
):
    """Update client subscription plan, credits, and expiry."""
    from app.models.client import Client

    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Klijent nije pronađen")

    changes = {}
    valid_plans = {"free", "pro", "enterprise"}

    if body.plan is not None:
        if body.plan not in valid_plans:
            raise HTTPException(
                status_code=400,
                detail=f"Plan mora biti: {', '.join(sorted(valid_plans))}",
            )
        changes["plan"] = {"old": client.plan, "new": body.plan}
        client.plan = body.plan

    if body.plan_expires_at is not None:
        old_val = client.plan_expires_at.isoformat() if client.plan_expires_at else None
        if body.plan_expires_at == "" or body.plan_expires_at == "null":
            client.plan_expires_at = None
            changes["plan_expires_at"] = {"old": old_val, "new": None}
        else:
            client.plan_expires_at = datetime.fromisoformat(body.plan_expires_at)
            changes["plan_expires_at"] = {"old": old_val, "new": body.plan_expires_at}

    if body.ai_credits_total is not None:
        changes["ai_credits_total"] = {"old": client.ai_credits_total, "new": body.ai_credits_total}
        client.ai_credits_total = body.ai_credits_total

    if body.ai_credits_used is not None:
        changes["ai_credits_used"] = {"old": client.ai_credits_used, "new": body.ai_credits_used}
        client.ai_credits_used = body.ai_credits_used

    await log_action(db, admin, "client.subscription_change", "client", client.id, changes)
    await db.commit()
    await db.refresh(client)

    return {
        "status": "updated",
        "plan": client.plan,
        "plan_expires_at": client.plan_expires_at.isoformat() if client.plan_expires_at else None,
        "ai_credits_total": client.ai_credits_total,
        "ai_credits_used": client.ai_credits_used,
    }


# ── Audit Log ────────────────────────────────────────────────────────

@router.get("/audit-log")
async def get_audit_log(
    skip: int = 0,
    limit: int = 50,
    action: str | None = Query(None, description="Filter by action type"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Paginated audit log with optional action filter."""
    from app.models.audit_log import AuditLog

    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    count_query = select(func.count(AuditLog.id))

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    entries = result.scalars().all()

    return {
        "entries": [
            {
                "id": str(e.id),
                "user_email": e.user_email,
                "action": e.action,
                "entity_type": e.entity_type,
                "entity_id": str(e.entity_id) if e.entity_id else None,
                "details": e.details,
                "created_at": e.created_at.isoformat() if e.created_at else "",
            }
            for e in entries
        ],
        "total": total,
    }
