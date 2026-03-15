"""Authentication router: login and current-user endpoints."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.auth_service import (
    create_access_token,
    hash_password,
    verify_invite_token,
    verify_password,
)

router = APIRouter()
logger = logging.getLogger(__name__)


async def _build_client_list(db: AsyncSession, user: "User") -> list[dict]:
    """Build the client list for a user response.

    Superadmins see ALL active clients (no membership required).
    Regular users see only clients where they have a UserClient membership.
    """
    from app.models.client import Client, UserClient
    from app.models.project import Project

    if user.is_superadmin:
        # Superadmin = god mode — see every active client
        clients_result = await db.execute(
            select(Client).where(Client.is_active == True).order_by(Client.name)
        )
        all_clients = clients_result.scalars().all()
        client_ids = [c.id for c in all_clients]
    else:
        # Regular user — only membership-based clients
        memberships_result = await db.execute(
            select(UserClient, Client)
            .join(Client, UserClient.client_id == Client.id)
            .where(UserClient.user_id == user.id, Client.is_active == True)
        )
        memberships = memberships_result.all()
        client_ids = [uc.client_id for uc, c in memberships]

    # Load projects for all relevant clients
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

    if user.is_superadmin:
        # For superadmins, always report onboarding_completed=True so the
        # frontend ProtectedRoute never redirects them to the onboarding wizard.
        # The real value is exposed as onboarding_completed_actual for UI display.
        return [
            {
                "client_id": str(c.id),
                "client_name": c.name,
                "client_slug": c.slug,
                "client_logo_url": c.logo_url,
                "role": "superadmin",
                "onboarding_completed": True,
                "onboarding_completed_actual": c.onboarding_completed,
                "business_description": c.business_description,
                "product_info": c.product_info,
                "tone_of_voice": c.tone_of_voice,
                "target_audience": c.target_audience,
                "brand_colors": c.brand_colors,
                "social_handles": c.social_handles,
                "logo_url": c.logo_url,
                "website_url": c.website_url,
                "languages": c.languages,
                "content_pillars": c.content_pillars,
                "hashtags": c.hashtags,
                "projects": projects_by_client.get(str(c.id), []),
            }
            for c in all_clients  # noqa: F821
        ]
    else:
        return [
            {
                "client_id": str(uc.client_id),
                "client_name": c.name,
                "client_slug": c.slug,
                "client_logo_url": c.logo_url,
                "role": uc.role,
                "onboarding_completed": c.onboarding_completed,
                "business_description": c.business_description,
                "product_info": c.product_info,
                "tone_of_voice": c.tone_of_voice,
                "target_audience": c.target_audience,
                "brand_colors": c.brand_colors,
                "social_handles": c.social_handles,
                "logo_url": c.logo_url,
                "website_url": c.website_url,
                "languages": c.languages,
                "content_pillars": c.content_pillars,
                "hashtags": c.hashtags,
                "projects": projects_by_client.get(str(uc.client_id), []),
            }
            for uc, c in memberships  # noqa: F821
        ]


class LoginRequest(PydanticBase):
    email: str
    password: str


class TokenResponse(PydanticBase):
    access_token: str
    token_type: str = "bearer"
    user: dict


class RegisterRequest(PydanticBase):
    email: str
    password: str
    full_name: str


class CreateOrganizationRequest(PydanticBase):
    company_name: str


class AcceptInviteRequest(PydanticBase):
    token: str
    email: str
    password: str
    full_name: str


class UserOut(PydanticBase):
    id: str
    email: str
    full_name: str
    role: str
    is_superadmin: bool = False
    is_active: bool
    clients: list = []


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password, return JWT token."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Neispravni podaci za prijavu",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Korisnički račun je deaktiviran",
        )

    user.last_login = datetime.now(timezone.utc)

    # Audit log
    from app.services.audit_service import log_action
    await log_action(db, user, "user.login", "user", user.id)

    await db.commit()

    token = create_access_token(data={"sub": user.email, "role": user.role})

    clients = await _build_client_list(db, user)

    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": "superadmin" if user.is_superadmin else user.role,
            "is_superadmin": user.is_superadmin,
            "is_active": user.is_active,
            "clients": clients,
        },
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return the currently authenticated user's profile."""
    clients = await _build_client_list(db, current_user)

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": "superadmin" if current_user.is_superadmin else current_user.role,
        "is_superadmin": current_user.is_superadmin,
        "is_active": current_user.is_active,
        "clients": clients,
    }


@router.post("/register", status_code=201, response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Self-service registration: creates user account only. Organization is created later in onboarding."""

    # Check if email already exists
    existing_user = await db.execute(select(User).where(User.email == body.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Korisnik s ovim e-mailom već postoji")

    # Create user (no client/project — that happens in onboarding)
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role="admin",
        is_active=True,
        is_superadmin=False,
    )
    db.add(user)

    # Audit log
    from app.services.audit_service import log_action
    await db.flush()
    await log_action(db, user, "user.register", "user", user.id)

    await db.commit()
    await db.refresh(user)

    logger.info("New registration: %s", body.email)

    token = create_access_token(data={"sub": user.email, "role": user.role})

    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_superadmin": user.is_superadmin,
            "is_active": user.is_active,
            "clients": [],
        },
    )


@router.post("/create-organization")
async def create_organization(
    body: CreateOrganizationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or return an organization (client) for the current user during onboarding.

    Uses upsert logic: if user already has a client, update its name and return it
    so navigating back/forward in the stepper never blocks the user.
    """
    import re

    from app.models.client import Client, UserClient
    from app.models.project import Project

    # Check if user already has a client
    existing_result = await db.execute(
        select(UserClient, Client)
        .join(Client, UserClient.client_id == Client.id)
        .where(UserClient.user_id == current_user.id)
    )
    existing = existing_result.first()

    if existing:
        # User already has an org — update name if changed and return it
        uc, client = existing
        if client.name != body.company_name:
            client.name = body.company_name
            new_slug = re.sub(r"[^a-z0-9]+", "-", body.company_name.lower()).strip("-") or "company"
            # Only update slug if the name actually changed
            slug_check = await db.execute(
                select(Client).where(Client.slug == new_slug, Client.id != client.id)
            )
            if not slug_check.scalar_one_or_none():
                client.slug = new_slug
            await db.commit()
            await db.refresh(client)

        # Fetch project
        proj_result = await db.execute(
            select(Project).where(Project.client_id == client.id).order_by(Project.created_at)
        )
        project = proj_result.scalars().first()

        return {
            "client_id": str(client.id),
            "client_name": client.name,
            "client_slug": client.slug,
            "client_logo_url": client.logo_url,
            "role": uc.role,
            "onboarding_completed": client.onboarding_completed,
            "projects": [
                {
                    "project_id": str(project.id),
                    "project_name": project.name,
                    "project_slug": project.slug,
                }
            ] if project else [],
        }

    # --- No org yet: create one ---

    # Generate slug from company name
    slug = re.sub(r"[^a-z0-9]+", "-", body.company_name.lower()).strip("-")
    if not slug:
        slug = "company"

    # Ensure slug uniqueness
    base_slug = slug
    counter = 1
    while True:
        existing_client = await db.execute(select(Client).where(Client.slug == slug))
        if not existing_client.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create client (onboarding not completed)
    client = Client(
        name=body.company_name,
        slug=slug,
        onboarding_completed=False,
    )
    db.add(client)
    await db.flush()

    # Create membership (admin role)
    membership = UserClient(
        user_id=current_user.id,
        client_id=client.id,
        role="admin",
    )
    db.add(membership)

    # Audit log
    from app.services.audit_service import log_action
    await log_action(db, current_user, "client.create", "client", client.id, {
        "client_name": body.company_name, "client_slug": slug,
    })

    await db.commit()
    await db.refresh(client)

    logger.info("Organization created: %s (slug=%s) by %s", body.company_name, slug, current_user.email)

    return {
        "client_id": str(client.id),
        "client_name": client.name,
        "client_slug": client.slug,
        "client_logo_url": client.logo_url,
        "role": "admin",
        "onboarding_completed": False,
        "projects": [],
    }


@router.post("/accept-invite", response_model=TokenResponse)
async def accept_invite(body: AcceptInviteRequest, db: AsyncSession = Depends(get_db)):
    """Accept an invitation to join a client. Creates user if needed, adds membership."""
    import uuid as _uuid

    # Verify invite token
    payload = verify_invite_token(body.token)
    if not payload:
        raise HTTPException(status_code=400, detail="Nevažeći ili istekli pozivni token")

    client_id = _uuid.UUID(payload["client_id"])
    invite_role = payload["role"]

    from app.models.client import Client, UserClient
    from app.models.project import Project

    # Verify client exists
    client_result = await db.execute(select(Client).where(Client.id == client_id, Client.is_active == True))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Klijent nije pronađen")

    # Check if user exists
    user_result = await db.execute(select(User).where(User.email == body.email))
    user = user_result.scalar_one_or_none()

    if user:
        # Existing user — just add membership
        existing_membership = await db.execute(
            select(UserClient).where(
                UserClient.user_id == user.id,
                UserClient.client_id == client_id,
            )
        )
        if existing_membership.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Već ste član ovog klijenta")
    else:
        # New user — create account
        user = User(
            email=body.email,
            hashed_password=hash_password(body.password),
            full_name=body.full_name,
            role=invite_role,
            is_active=True,
            is_superadmin=False,
        )
        db.add(user)
        await db.flush()

    # Create membership
    membership = UserClient(
        user_id=user.id,
        client_id=client_id,
        role=invite_role,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(user)

    logger.info("Invite accepted: %s joined %s (role=%s)", body.email, client.slug, invite_role)

    token = create_access_token(data={"sub": user.email, "role": user.role})

    clients_list = await _build_client_list(db, user)

    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_superadmin": user.is_superadmin,
            "is_active": user.is_active,
            "clients": clients_list,
        },
    )
