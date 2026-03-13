"""Client management router: CRUD for clients and user memberships."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import (
    get_current_client,
    get_current_user,
    require_admin_role,
    require_superadmin,
)
from app.models.client import Client, UserClient
from app.models.user import User
from app.schemas.client import (
    AddMemberRequest,
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    MemberResponse,
    UpdateRoleRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# --- User's own client list (for the switcher) ---

@router.get("/my/clients")
async def my_clients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all clients the current user belongs to."""
    if current_user.is_superadmin:
        # Superadmin sees all active clients
        result = await db.execute(
            select(Client).where(Client.is_active == True).order_by(Client.name)
        )
        clients = result.scalars().all()
        return [
            {
                "client_id": str(c.id),
                "client_name": c.name,
                "client_slug": c.slug,
                "client_logo_url": c.logo_url,
                "role": "superadmin",
            }
            for c in clients
        ]

    result = await db.execute(
        select(UserClient, Client)
        .join(Client, UserClient.client_id == Client.id)
        .where(UserClient.user_id == current_user.id, Client.is_active == True)
        .order_by(Client.name)
    )
    return [
        {
            "client_id": str(uc.client_id),
            "client_name": c.name,
            "client_slug": c.slug,
            "client_logo_url": c.logo_url,
            "role": uc.role,
        }
        for uc, c in result.all()
    ]


# --- Client CRUD (superadmin only for create/list-all) ---

@router.get("/")
async def list_clients(
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """List all clients. Superadmin only."""
    result = await db.execute(select(Client).order_by(Client.name))
    clients = result.scalars().all()
    return [
        ClientResponse(
            id=str(c.id),
            name=c.name,
            slug=c.slug,
            is_active=c.is_active,
            business_description=c.business_description,
            product_info=c.product_info,
            tone_of_voice=c.tone_of_voice,
            target_audience=c.target_audience,
            brand_colors=c.brand_colors,
            brand_fonts=c.brand_fonts,
            logo_url=c.logo_url,
            website_url=c.website_url,
            languages=c.languages,
            content_pillars=c.content_pillars,
            social_handles=c.social_handles,
            hashtags=c.hashtags,
            ai_system_prompt_override=c.ai_system_prompt_override,
        )
        for c in clients
    ]


@router.post("/", status_code=201)
async def create_client(
    body: ClientCreate,
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new client with brand profile. Superadmin only."""
    # Check slug uniqueness
    existing = await db.execute(select(Client).where(Client.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug već postoji")

    client = Client(
        name=body.name,
        slug=body.slug,
        business_description=body.business_description,
        product_info=body.product_info,
        tone_of_voice=body.tone_of_voice,
        target_audience=body.target_audience,
        brand_colors=body.brand_colors,
        brand_fonts=body.brand_fonts,
        logo_url=body.logo_url,
        website_url=body.website_url,
        languages=body.languages,
        content_pillars=body.content_pillars,
        social_handles=body.social_handles,
        hashtags=body.hashtags,
        ai_system_prompt_override=body.ai_system_prompt_override,
    )
    db.add(client)
    await db.flush()

    # Auto-add the creating superadmin as admin on the new client
    membership = UserClient(
        user_id=current_user.id,
        client_id=client.id,
        role="admin",
    )
    db.add(membership)
    await db.commit()

    logger.info("Client created: %s (slug=%s) by %s", client.name, client.slug, current_user.email)
    return {"id": str(client.id), "slug": client.slug, "name": client.name}


@router.get("/{client_id}")
async def get_client(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Get client details. Any member can view their own client."""
    user, client, role = ctx
    return ClientResponse(
        id=str(client.id),
        name=client.name,
        slug=client.slug,
        is_active=client.is_active,
        business_description=client.business_description,
        product_info=client.product_info,
        tone_of_voice=client.tone_of_voice,
        target_audience=client.target_audience,
        brand_colors=client.brand_colors,
        brand_fonts=client.brand_fonts,
        logo_url=client.logo_url,
        website_url=client.website_url,
        languages=client.languages,
        content_pillars=client.content_pillars,
        social_handles=client.social_handles,
        hashtags=client.hashtags,
        ai_system_prompt_override=client.ai_system_prompt_override,
    )


@router.post("/{client_id}/onboarding/complete")
async def complete_onboarding(
    body: ClientUpdate,
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """Complete onboarding: save brand profile and mark as completed. Admin only."""
    user, client, role = ctx
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)
    client.onboarding_completed = True
    await db.commit()
    logger.info("Onboarding completed: %s by %s", client.slug, user.email)
    return {"status": "onboarding_completed"}


@router.put("/{client_id}")
async def update_client(
    body: ClientUpdate,
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """Update client brand profile. Client admin or superadmin only."""
    user, client, role = ctx
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)
    await db.commit()
    logger.info("Client updated: %s by %s", client.slug, user.email)
    return {"status": "updated"}


# --- Membership management ---

@router.get("/{client_id}/members")
async def list_members(
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """List members of a client. Client admin or superadmin."""
    user, client, role = ctx
    result = await db.execute(
        select(UserClient, User)
        .join(User, UserClient.user_id == User.id)
        .where(UserClient.client_id == client.id, User.is_superadmin == False)
        .order_by(User.full_name)
    )
    return [
        MemberResponse(
            user_id=str(uc.user_id),
            email=u.email,
            full_name=u.full_name,
            role=uc.role,
            is_active=u.is_active,
        )
        for uc, u in result.all()
    ]


@router.post("/{client_id}/members", status_code=201)
async def add_member(
    body: AddMemberRequest,
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """Add a user to a client with a role. Client admin or superadmin."""
    admin_user, client, admin_role = ctx

    # Find the user by email
    result = await db.execute(select(User).where(User.email == body.email))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    # Check if already a member
    existing = await db.execute(
        select(UserClient).where(
            UserClient.user_id == target_user.id,
            UserClient.client_id == client.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Korisnik je već član ovog klijenta")

    membership = UserClient(
        user_id=target_user.id,
        client_id=client.id,
        role=body.role,
    )
    db.add(membership)
    await db.commit()
    logger.info("Member added: %s → %s (role=%s) by %s", target_user.email, client.slug, body.role, admin_user.email)
    return {"status": "added"}


@router.put("/{client_id}/members/{user_id}")
async def update_member_role(
    user_id: str,
    body: UpdateRoleRequest,
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """Change a member's role on a client. Client admin or superadmin."""
    admin_user, client, admin_role = ctx
    import uuid as _uuid

    result = await db.execute(
        select(UserClient).where(
            UserClient.user_id == _uuid.UUID(user_id),
            UserClient.client_id == client.id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Članstvo nije pronađeno")

    membership.role = body.role
    await db.commit()
    logger.info("Member role updated: %s on %s → %s by %s", user_id, client.slug, body.role, admin_user.email)
    return {"status": "updated"}


@router.delete("/{client_id}/members/{user_id}")
async def remove_member(
    user_id: str,
    ctx: tuple = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db),
):
    """Remove a user from a client. Client admin or superadmin."""
    admin_user, client, admin_role = ctx
    import uuid as _uuid

    result = await db.execute(
        select(UserClient).where(
            UserClient.user_id == _uuid.UUID(user_id),
            UserClient.client_id == client.id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Članstvo nije pronađeno")

    await db.delete(membership)
    await db.commit()
    logger.info("Member removed: %s from %s by %s", user_id, client.slug, admin_user.email)
    return {"status": "removed"}


# --- Invitation ---

class InviteRequest(AddMemberRequest):
    pass  # same fields: email, role


@router.post("/{client_id}/members/invite", status_code=201)
async def invite_member(
    body: InviteRequest,
    ctx: tuple = Depends(require_admin_role),
):
    """Generate an invite link for a new member. Admin only."""
    from app.config import settings
    from app.services.auth_service import create_invite_token

    admin_user, client, admin_role = ctx
    token = create_invite_token(
        client_id=str(client.id),
        role=body.role,
        inviter_email=admin_user.email,
    )
    frontend_url = settings.CORS_ORIGINS.split(",")[0].strip()
    invite_url = f"{frontend_url}/invite?token={token}"

    logger.info("Invite created: %s → %s (role=%s) by %s", body.email, client.slug, body.role, admin_user.email)
    return {
        "invite_url": invite_url,
        "email": body.email,
        "role": body.role,
        "expires_in_hours": 72,
    }
