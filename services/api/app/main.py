from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    academy,
    analytics,
    campaigns,
    champions_league,
    channel_audit,
    competitors,
    content,
    diaspora,
    engagement,
    fans,
    market_research,
    optimization,
    reports,
    sentiment,
    settings as settings_router,
    social_listening,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="GNK Dinamo Zagreb - AI-Powered Marketing Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(market_research.router, prefix="/api/v1/market-research", tags=["Market Research"])
app.include_router(channel_audit.router, prefix="/api/v1/channels", tags=["Channel Audit"])
app.include_router(competitors.router, prefix="/api/v1/competitors", tags=["Competitors"])
app.include_router(fans.router, prefix="/api/v1/fans", tags=["Fan Data"])
app.include_router(content.router, prefix="/api/v1/content", tags=["Content Engine"])
app.include_router(campaigns.router, prefix="/api/v1/campaigns", tags=["Campaigns"])
app.include_router(optimization.router, prefix="/api/v1/optimization", tags=["Optimization"])
app.include_router(sentiment.router, prefix="/api/v1/sentiment", tags=["Sentiment"])
app.include_router(social_listening.router, prefix="/api/v1/social-listening", tags=["Social Listening"])
app.include_router(academy.router, prefix="/api/v1/academy", tags=["Academy"])
app.include_router(diaspora.router, prefix="/api/v1/diaspora", tags=["Diaspora"])
app.include_router(champions_league.router, prefix="/api/v1/champions-league", tags=["Champions League"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(engagement.router, prefix="/api/v1/engagement", tags=["Engagement"])
app.include_router(settings_router.router, prefix="/api/v1/settings", tags=["Settings"])


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "mock_mode": settings.DM_USE_MOCK_APIS,
    }
