import asyncio
import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db, async_session_factory
from app.services.analytics_aggregator import AnalyticsAggregatorService
from app.services.attribution import AttributionService

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_analytics_service():
    return AnalyticsAggregatorService()


def _get_attribution_service():
    return AttributionService()


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Full dashboard overview: KPIs + reach series + funnel + top posts."""
    from app.services.cache import cache_get, cache_set
    from app.config import settings as cfg

    cached = await cache_get("analytics:overview")
    if cached is not None:
        return cached

    service = _get_analytics_service()
    result = await service.get_overview_for_dashboard(db)
    await cache_set("analytics:overview", result, cfg.CACHE_TTL_DASHBOARD)
    return result


@router.get("/platforms")
async def get_platform_breakdown(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    from app.services.cache import cache_get, cache_set
    from app.config import settings as cfg

    cache_key = f"analytics:platforms:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    service = _get_analytics_service()
    result = await service.get_platform_breakdown(db, days)
    await cache_set(cache_key, result, cfg.CACHE_TTL_ANALYTICS)
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


@router.get("/ads")
async def get_all_ads_metrics(
    platform: str = Query(default=None),
    campaign_id: str = Query(default=None),
    sort_by: str = Query(default="spend"),
    sort_dir: str = Query(default="desc"),
    limit: int = Query(default=50),
    db: AsyncSession = Depends(get_db),
):
    """All ads with aggregated metrics, sortable and filterable."""
    from app.models.campaign import Ad, AdSet, Campaign
    from app.models.analytics import AdMetric
    from sqlalchemy import func as sqlfunc

    query = (
        select(
            Ad.id,
            Ad.variant_label,
            Ad.headline,
            Ad.description,
            Ad.image_url,
            Ad.status,
            Campaign.id.label("campaign_id"),
            Campaign.name.label("campaign_name"),
            Campaign.platform,
            sqlfunc.coalesce(sqlfunc.sum(AdMetric.impressions), 0).label("impressions"),
            sqlfunc.coalesce(sqlfunc.sum(AdMetric.clicks), 0).label("clicks"),
            sqlfunc.coalesce(sqlfunc.sum(AdMetric.spend), 0).label("spend"),
            sqlfunc.coalesce(sqlfunc.sum(AdMetric.conversions), 0).label("conversions"),
            sqlfunc.coalesce(sqlfunc.sum(AdMetric.conversion_value), 0).label("conversion_value"),
        )
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .outerjoin(AdMetric, AdMetric.ad_id == Ad.id)
        .group_by(Ad.id, Campaign.id)
    )

    if platform:
        query = query.where(Campaign.platform == platform)
    if campaign_id:
        from uuid import UUID as UUIDType
        try:
            query = query.where(Campaign.id == UUIDType(campaign_id))
        except ValueError:
            pass

    # Sort
    sort_map = {
        "spend": sqlfunc.coalesce(sqlfunc.sum(AdMetric.spend), 0),
        "clicks": sqlfunc.coalesce(sqlfunc.sum(AdMetric.clicks), 0),
        "impressions": sqlfunc.coalesce(sqlfunc.sum(AdMetric.impressions), 0),
        "conversions": sqlfunc.coalesce(sqlfunc.sum(AdMetric.conversions), 0),
        "name": Ad.headline,
    }
    sort_col = sort_map.get(sort_by, sort_map["spend"])
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    query = query.limit(limit)
    result = await db.execute(query)
    rows = result.all()

    ads = []
    for row in rows:
        impressions = int(row.impressions)
        clicks = int(row.clicks)
        spend = float(row.spend)
        conversions = int(row.conversions)
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        roas = (float(row.conversion_value) / spend) if spend > 0 else 0

        ads.append({
            "ad_id": str(row.id),
            "variant_label": row.variant_label,
            "headline": row.headline,
            "image_url": row.image_url,
            "status": row.status,
            "campaign_id": str(row.campaign_id),
            "campaign_name": row.campaign_name,
            "platform": row.platform,
            "impressions": impressions,
            "clicks": clicks,
            "ctr": round(ctr, 2),
            "spend": round(spend, 2),
            "conversions": conversions,
            "roas": round(roas, 2),
        })

    return {"ads": ads, "total": len(ads)}


@router.get("/ads/{ad_id}/history")
async def get_ad_metrics_history(
    ad_id: UUID,
    days: int = Query(default=7),
    db: AsyncSession = Depends(get_db),
):
    """Time-series metrics for a single ad."""
    from app.models.analytics import AdMetric

    result = await db.execute(
        select(AdMetric)
        .where(AdMetric.ad_id == ad_id)
        .order_by(AdMetric.timestamp.desc())
        .limit(days)
    )
    metrics = result.scalars().all()

    return {
        "ad_id": str(ad_id),
        "metrics": [
            {
                "date": m.timestamp.strftime("%Y-%m-%d") if m.timestamp else "",
                "impressions": m.impressions,
                "clicks": m.clicks,
                "ctr": m.ctr,
                "spend": round(m.spend, 2),
                "conversions": m.conversions,
                "roas": m.roas,
            }
            for m in reversed(metrics)
        ],
    }


@router.get("/attribution")
async def get_attribution_report(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    service = _get_attribution_service()
    result = await service.get_attribution_report(db, days)
    return result


# ------------------------------------------------------------------
# Phase 3: ROI, history & WebSocket
# ------------------------------------------------------------------

@router.get("/roi/summary")
async def get_roi_summary(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    """ROAS, CPA, total spend, conversions, conversion value."""
    service = _get_analytics_service()
    return await service.get_roi_summary(db, days)


@router.get("/roi/by-platform")
async def get_roi_by_platform(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    """ROI breakdown per platform."""
    service = _get_analytics_service()
    return await service.get_roi_by_platform(db, days)


@router.get("/post-metrics/{post_id}/history")
async def get_post_metrics_history(
    post_id: UUID,
    days: int = Query(default=7),
    db: AsyncSession = Depends(get_db),
):
    """Time-series metrics for a single post."""
    service = _get_analytics_service()
    return await service.get_post_metrics_history(db, post_id, days)


@router.websocket("/ws/live")
async def live_metrics(websocket: WebSocket):
    """Push latest aggregated KPIs every 30 seconds."""
    # Verify auth token from query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    from app.services.auth_service import verify_token
    if verify_token(token) is None:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    service = _get_analytics_service()

    try:
        while True:
            async with async_session_factory() as db:
                data = await service.get_overview_for_dashboard(db)
            await websocket.send_json(data)
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
