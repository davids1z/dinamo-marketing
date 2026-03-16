import asyncio
import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db, async_session_factory
from app.dependencies import get_current_client
from app.services.analytics_aggregator import AnalyticsAggregatorService
from app.services.attribution import AttributionService

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_analytics_service():
    return AnalyticsAggregatorService()


def _get_attribution_service():
    return AttributionService()


@router.get("/overview")
async def get_overview(
    days: int = Query(default=30),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Full dashboard overview: KPIs + reach series + funnel + top posts."""
    user, client, role = ctx
    from app.services.cache import cache_get, cache_set
    from app.config import settings as cfg

    cache_key = f"analytics:overview:{client.id}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    service = _get_analytics_service()
    result = await service.get_overview_for_dashboard(db, days, client_id=client.id)
    await cache_set(cache_key, result, cfg.CACHE_TTL_DASHBOARD)
    return result


@router.get("/platforms")
async def get_platform_breakdown(
    days: int = Query(default=30),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    from app.services.cache import cache_get, cache_set
    from app.config import settings as cfg

    cache_key = f"analytics:platforms:{client.id}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    service = _get_analytics_service()
    result = await service.get_platform_breakdown(db, days, client_id=client.id)
    await cache_set(cache_key, result, cfg.CACHE_TTL_ANALYTICS)
    return result


@router.get("/markets")
async def get_market_performance(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_analytics_service()
    result = await service.get_market_performance(db, client_id=client.id)
    return result


@router.get("/content-ranking")
async def get_content_rankings(
    limit: int = Query(default=20),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_analytics_service()
    result = await service.get_content_rankings(db, limit, client_id=client.id)
    return result


@router.get("/post-metrics/{post_id}")
async def get_post_metrics(
    post_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    from app.models import PostMetric

    query = select(PostMetric).where(PostMetric.post_id == post_id, PostMetric.client_id == client.id)
    res = await db.execute(query)
    metrics = res.scalar_one_or_none()
    if not metrics:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Post metrics not found")
    return metrics


@router.get("/ad-metrics/{ad_id}")
async def get_ad_metrics(
    ad_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    from app.models import AdMetric

    query = select(AdMetric).where(AdMetric.ad_id == ad_id, AdMetric.client_id == client.id)
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
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """All ads with aggregated metrics, sortable and filterable."""
    user, client, role = ctx
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
        .where(Campaign.client_id == client.id)
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
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Time-series metrics for a single ad."""
    user, client, role = ctx
    from app.models.analytics import AdMetric

    result = await db.execute(
        select(AdMetric)
        .where(AdMetric.ad_id == ad_id, AdMetric.client_id == client.id)
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
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_attribution_service()
    result = await service.get_attribution_report(db, days)
    return result


# ------------------------------------------------------------------
# Phase 3: ROI, history & WebSocket
# ------------------------------------------------------------------

@router.get("/roi/summary")
async def get_roi_summary(
    days: int = Query(default=30),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """ROAS, CPA, total spend, conversions, conversion value."""
    user, client, role = ctx
    service = _get_analytics_service()
    return await service.get_roi_summary(db, days, client_id=client.id)


@router.get("/roi/by-platform")
async def get_roi_by_platform(
    days: int = Query(default=30),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """ROI breakdown per platform."""
    user, client, role = ctx
    service = _get_analytics_service()
    return await service.get_roi_by_platform(db, days, client_id=client.id)


@router.get("/post-metrics/{post_id}/history")
async def get_post_metrics_history(
    post_id: UUID,
    days: int = Query(default=7),
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Time-series metrics for a single post."""
    user, client, role = ctx
    service = _get_analytics_service()
    return await service.get_post_metrics_history(db, post_id, days, client_id=client.id)


@router.websocket("/ws/live")
async def live_metrics(websocket: WebSocket):
    """Push latest aggregated KPIs every 30 seconds, scoped to a single client.

    Query params (both required):
      token     — JWT access token (same as Bearer token used by REST endpoints)
      client_id — UUID of the client whose data should be streamed

    The endpoint verifies the JWT, loads the user, and confirms the user has
    an active membership for the requested client before accepting the
    connection.  Unauthenticated or unauthorised connections are rejected with
    close code 4001 / 4003 *before* websocket.accept() is called, so no data
    is ever sent to them.
    """
    # ------------------------------------------------------------------
    # 1. Extract and validate query params (reject before accept)
    # ------------------------------------------------------------------
    token = websocket.query_params.get("token")
    raw_client_id = websocket.query_params.get("client_id")

    if not token or not raw_client_id:
        await websocket.close(code=4001)
        return

    # ------------------------------------------------------------------
    # 2. Verify JWT and extract user identity
    # ------------------------------------------------------------------
    from app.services.auth_service import verify_token as _verify_token
    payload = _verify_token(token)
    if payload is None:
        await websocket.close(code=4001)
        return

    email = payload.get("sub")
    if not email:
        await websocket.close(code=4001)
        return

    # ------------------------------------------------------------------
    # 3. Parse client_id UUID
    # ------------------------------------------------------------------
    try:
        from uuid import UUID as _UUID
        client_uuid = _UUID(raw_client_id)
    except (ValueError, AttributeError):
        await websocket.close(code=4003)
        return

    # ------------------------------------------------------------------
    # 4. Load user from DB and verify client membership
    # ------------------------------------------------------------------
    from sqlalchemy import select as _select
    from app.models.user import User
    from app.models.client import Client, UserClient

    async with async_session_factory() as auth_db:
        user_result = await auth_db.execute(
            _select(User).where(User.email == email, User.is_active == True)
        )
        user = user_result.scalar_one_or_none()
        if user is None:
            await websocket.close(code=4001)
            return

        client_result = await auth_db.execute(
            _select(Client).where(Client.id == client_uuid, Client.is_active == True)
        )
        client = client_result.scalar_one_or_none()
        if client is None:
            await websocket.close(code=4003)
            return

        if not user.is_superadmin:
            membership_result = await auth_db.execute(
                _select(UserClient).where(
                    UserClient.user_id == user.id,
                    UserClient.client_id == client_uuid,
                )
            )
            membership = membership_result.scalar_one_or_none()
            if membership is None:
                await websocket.close(code=4003)
                return

    # ------------------------------------------------------------------
    # 5. Auth passed — accept the connection and start streaming
    # ------------------------------------------------------------------
    await websocket.accept()
    logger.info(
        "WebSocket /ws/live accepted: user=%s client_id=%s",
        email,
        client_uuid,
    )

    service = _get_analytics_service()

    try:
        while True:
            async with async_session_factory() as db:
                data = await service.get_overview_for_dashboard(
                    db, client_id=client_uuid
                )
            await websocket.send_json(data)
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        logger.info(
            "WebSocket /ws/live disconnected: user=%s client_id=%s",
            email,
            client_uuid,
        )
    except Exception as exc:
        logger.warning(
            "WebSocket /ws/live error: user=%s client_id=%s err=%s",
            email,
            client_uuid,
            exc,
        )
