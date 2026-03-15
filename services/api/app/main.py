import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.staticfiles import StaticFiles

from app.config import settings
from app.dependencies import get_current_user
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.routers import (
    academy,
    admin,
    ai_insights,
    analytics,
    auth,
    campaign_research,
    campaigns,
    champions_league,
    channel_audit,
    clients,
    competitors,
    content,
    diaspora,
    engagement,
    fans,
    market_research,
    optimization,
    projects,
    reports,
    sentiment,
    settings as settings_router,
    social_listening,
    studio,
)

logger = logging.getLogger(__name__)

_auth = [Depends(get_current_user)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from app.middleware.logging import setup_logging

    setup_logging()

    if settings.SENTRY_DSN:
        try:
            import sentry_sdk

            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
                environment=settings.SENTRY_ENVIRONMENT,
                send_default_pii=False,
            )
            logger.info("Sentry initialized (env=%s)", settings.SENTRY_ENVIRONMENT)
        except ImportError:
            logger.warning("sentry-sdk not installed, skipping Sentry init")

    logger.info("ShiftOneZero Marketing Platform started")
    yield
    # Shutdown
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="ShiftOneZero - AI-Powered Marketing Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Middleware (order matters: last added = first executed)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID", "X-Client-ID", "X-Project-ID"],
)

# Auth router (public — no auth dependency)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

# Admin router (has its own require_admin dependency inside)
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"], dependencies=_auth)

# Client management router (multi-tenant RBAC)
app.include_router(clients.router, prefix="/api/v1/clients", tags=["Clients"], dependencies=_auth)

# Project management router (client-scoped)
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"], dependencies=_auth)

# Protected routers
app.include_router(market_research.router, prefix="/api/v1/market-research", tags=["Market Research"], dependencies=_auth)
app.include_router(channel_audit.router, prefix="/api/v1/channels", tags=["Channel Audit"], dependencies=_auth)
app.include_router(competitors.router, prefix="/api/v1/competitors", tags=["Competitors"], dependencies=_auth)
app.include_router(fans.router, prefix="/api/v1/fans", tags=["Fan Data"], dependencies=_auth)
app.include_router(content.router, prefix="/api/v1/content", tags=["Content Engine"], dependencies=_auth)
app.include_router(campaigns.router, prefix="/api/v1/campaigns", tags=["Campaigns"], dependencies=_auth)
app.include_router(optimization.router, prefix="/api/v1/optimization", tags=["Optimization"], dependencies=_auth)
app.include_router(sentiment.router, prefix="/api/v1/sentiment", tags=["Sentiment"], dependencies=_auth)
app.include_router(social_listening.router, prefix="/api/v1/social-listening", tags=["Social Listening"], dependencies=_auth)
app.include_router(academy.router, prefix="/api/v1/academy", tags=["Academy"], dependencies=_auth)
app.include_router(diaspora.router, prefix="/api/v1/diaspora", tags=["Diaspora"], dependencies=_auth)
app.include_router(champions_league.router, prefix="/api/v1/champions-league", tags=["Champions League"], dependencies=_auth)
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"], dependencies=_auth)
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"], dependencies=_auth)
app.include_router(engagement.router, prefix="/api/v1/engagement", tags=["Engagement"], dependencies=_auth)
app.include_router(settings_router.router, prefix="/api/v1/settings", tags=["Settings"], dependencies=_auth)
app.include_router(studio.router, prefix="/api/v1/studio", tags=["Content Studio"], dependencies=_auth)
app.include_router(campaign_research.router, prefix="/api/v1/campaign-research", tags=["Campaign Research"], dependencies=_auth)
app.include_router(ai_insights.router, prefix="/api/v1/ai-insights", tags=["AI Insights"], dependencies=_auth)


# Static media files (generated images)
_media_dir = Path(settings.MEDIA_ROOT)
_media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_media_dir)), name="media")


# Public health endpoints (no auth)
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "mock_mode": settings.SOZ_USE_MOCK_APIS,
    }


@app.get("/api/v1/health/live")
async def liveness():
    """Lightweight liveness probe for Docker/K8s."""
    return {"status": "alive"}
