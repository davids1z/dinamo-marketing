from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client, get_meta_client
from app.services.analytics_aggregator import AnalyticsAggregatorService
from app.services.attribution import AttributionService

router = APIRouter()


def _get_analytics_service():
    return AnalyticsAggregatorService()


def _get_attribution_service():
    return AttributionService()


@router.get("/overview")
async def get_overview_kpis(db: AsyncSession = Depends(get_db)):
    service = _get_analytics_service()
    result = await service.get_overview_kpis(db)
    return result


@router.get("/platforms")
async def get_platform_breakdown(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    service = _get_analytics_service()
    result = await service.get_platform_breakdown(db, days)
    return result


@router.get("/markets")
async def get_market_performance(db: AsyncSession = Depends(get_db)):
    service = _get_analytics_service()
    result = await service.get_market_performance(db)
    return result


@router.get("/content-ranking")
async def get_content_rankings(
    limit: int = Query(default=20),
    db: AsyncSession = Depends(get_db),
):
    service = _get_analytics_service()
    result = await service.get_content_rankings(db, limit)
    return result


@router.get("/post-metrics/{post_id}")
async def get_post_metrics(post_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models import PostMetric

    query = select(PostMetric).where(PostMetric.post_id == post_id)
    res = await db.execute(query)
    metrics = res.scalar_one_or_none()
    if not metrics:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Post metrics not found")
    return metrics


@router.get("/ad-metrics/{ad_id}")
async def get_ad_metrics(ad_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models import AdMetric

    query = select(AdMetric).where(AdMetric.ad_id == ad_id)
    res = await db.execute(query)
    metrics = res.scalar_one_or_none()
    if not metrics:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Ad metrics not found")
    return metrics


@router.get("/attribution")
async def get_attribution_report(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    service = _get_attribution_service()
    result = await service.get_attribution_report(db, days)
    return result
