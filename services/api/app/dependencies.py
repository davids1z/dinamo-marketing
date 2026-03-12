"""Dependency injection factory: resolves mock vs real API clients based on config."""

import uuid as _uuid
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services.auth_service import verify_token

_security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
    db: AsyncSession = Depends(get_db),
):
    """Extract Bearer token, verify JWT, load user from DB."""
    from app.models.user import User

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nevažeći ili istekli token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nevažeći token",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Korisnik nije pronađen",
        )

    return user


async def get_client_id(
    x_client_id: str = Header(..., alias="X-Client-ID"),
) -> _uuid.UUID:
    """Extract and validate the X-Client-ID header."""
    try:
        return _uuid.UUID(x_client_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nevažeći X-Client-ID header",
        )


async def get_current_client(
    client_id: _uuid.UUID = Depends(get_client_id),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple:
    """
    Validate that the current user has access to the requested client.
    Returns (user, client, role) tuple.
    Superadmins bypass membership check.
    """
    from app.models.client import Client, UserClient

    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.is_active == True)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Klijent nije pronađen")

    if current_user.is_superadmin:
        return (current_user, client, "superadmin")

    result = await db.execute(
        select(UserClient).where(
            UserClient.user_id == current_user.id,
            UserClient.client_id == client_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate pristup ovom klijentu",
        )

    return (current_user, client, membership.role)


async def get_project_id(
    x_project_id: str = Header(..., alias="X-Project-ID"),
) -> _uuid.UUID:
    """Extract and validate the X-Project-ID header."""
    try:
        return _uuid.UUID(x_project_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nevažeći X-Project-ID header",
        )


async def get_current_project(
    project_id: _uuid.UUID = Depends(get_project_id),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
) -> tuple:
    """
    Validate that the requested project belongs to the user's current client.
    Returns (user, client, project, role) 4-tuple.
    """
    from app.models.project import Project

    user, client, role = ctx

    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.client_id == client.id,
            Project.is_active == True,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Projekt nije pronađen ili ne pripada ovom klijentu",
        )

    return (user, client, project, role)


def require_role(*allowed_roles: str):
    """Factory: returns a dependency that checks the user's client role."""
    async def _check(ctx: tuple = Depends(get_current_client)):
        user, client, role = ctx
        if role == "superadmin":
            return ctx
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Potrebna uloga: {', '.join(allowed_roles)}",
            )
        return ctx
    return _check


require_viewer = require_role("viewer", "moderator", "admin")
require_moderator = require_role("moderator", "admin")
require_admin_role = require_role("admin")


async def require_superadmin(current_user=Depends(get_current_user)):
    """Platform-wide superadmin check (no client context needed)."""
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Samo superadmin ima pristup",
        )
    return current_user


@lru_cache
def get_meta_client():
    if settings.use_mock("meta"):
        from app.integrations.meta.mock import MetaMockClient
        return MetaMockClient()
    from app.integrations.meta.client import MetaClient
    return MetaClient(
        app_id=settings.META_APP_ID,
        app_secret=settings.META_APP_SECRET,
        access_token=settings.META_ACCESS_TOKEN,
        ad_account_id=settings.META_AD_ACCOUNT_ID,
        page_id=settings.META_PAGE_ID,
        instagram_account_id=settings.META_INSTAGRAM_ACCOUNT_ID,
    )


@lru_cache
def get_tiktok_client():
    if settings.use_mock("tiktok"):
        from app.integrations.tiktok.mock import TikTokMockClient
        return TikTokMockClient()
    from app.integrations.tiktok.client import TikTokClient
    return TikTokClient(
        app_id=settings.TIKTOK_APP_ID,
        app_secret=settings.TIKTOK_APP_SECRET,
        access_token=settings.TIKTOK_ACCESS_TOKEN,
        advertiser_id=settings.TIKTOK_ADVERTISER_ID,
    )


@lru_cache
def get_youtube_client():
    if settings.use_mock("youtube"):
        from app.integrations.youtube.mock import YouTubeMockClient
        return YouTubeMockClient()
    from app.integrations.youtube.client import YouTubeClient
    return YouTubeClient(
        api_key=settings.YOUTUBE_API_KEY,
        channel_id=settings.YOUTUBE_CHANNEL_ID,
    )


@lru_cache
def get_ga4_client():
    if settings.use_mock("ga4"):
        from app.integrations.google_analytics.mock import GA4MockClient
        return GA4MockClient()
    from app.integrations.google_analytics.client import GA4Client
    return GA4Client(
        property_id=settings.GA4_PROPERTY_ID,
        credentials_json=settings.GA4_CREDENTIALS_JSON,
    )


@lru_cache
def get_sports_data_client():
    if settings.use_mock("sports_data"):
        from app.integrations.sports_data.mock import SportsDataMockClient
        return SportsDataMockClient()
    from app.integrations.sports_data.client import SportsDataClient
    return SportsDataClient(
        api_key=settings.API_FOOTBALL_API_KEY,
        provider="api-football",
    )


@lru_cache
def get_claude_client():
    if settings.use_mock("claude"):
        from app.integrations.claude_ai.mock import ClaudeMockClient
        return ClaudeMockClient()
    from app.integrations.claude_ai.client import ClaudeClient
    return ClaudeClient(api_key=settings.ANTHROPIC_API_KEY)


@lru_cache
def get_buffer_client():
    if settings.use_mock("buffer"):
        from app.integrations.buffer.mock import BufferMockClient
        return BufferMockClient()
    from app.integrations.buffer.client import BufferClient
    return BufferClient(access_token=settings.BUFFER_ACCESS_TOKEN)


@lru_cache
def get_image_gen_client():
    if settings.use_mock("image_gen"):
        from app.integrations.image_gen.mock import ImageGenMockClient
        return ImageGenMockClient()
    from app.integrations.image_gen.client import ImageGenClient
    return ImageGenClient(
        openai_key=settings.OPENAI_API_KEY,
        stability_key=settings.STABILITY_API_KEY,
    )


@lru_cache
def get_trends_client():
    if settings.use_mock("trends"):
        from app.integrations.trends.mock import TrendsMockClient
        return TrendsMockClient()
    from app.integrations.trends.client import TrendsClient
    return TrendsClient()


def get_publisher():
    """Create a UnifiedPublisher wired to the active API clients."""
    from app.services.publisher import UnifiedPublisher
    return UnifiedPublisher(
        meta_client=get_meta_client(),
        tiktok_client=get_tiktok_client(),
        youtube_client=get_youtube_client(),
        buffer_client=get_buffer_client(),
    )


@lru_cache
def get_media_storage():
    from app.services.media_storage import MediaStorageService
    return MediaStorageService(settings.MEDIA_ROOT)


def get_content_creator():
    from app.services.content_creator import ContentCreatorService
    return ContentCreatorService(get_image_gen_client(), get_media_storage())


@lru_cache
def get_studio_service():
    from app.services.studio_service import StudioService
    return StudioService(settings.MEDIA_ROOT)


@lru_cache
def get_web_research_client():
    if settings.use_mock("web_research"):
        from app.integrations.web_research.mock import WebResearchMockClient
        return WebResearchMockClient()
    from app.integrations.web_research.client import WebResearchClient
    return WebResearchClient(api_key=settings.TAVILY_API_KEY)
