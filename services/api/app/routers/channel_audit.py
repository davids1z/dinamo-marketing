from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import date, timedelta

from app.database import get_db
from app.dependencies import get_current_client, get_meta_client, get_tiktok_client, get_youtube_client, get_ga4_client
from app.services.channel_audit import ChannelAuditService
from app.models.channel import SocialChannel, ChannelMetric, ChannelHealthScore

router = APIRouter()


def _get_service():
    return ChannelAuditService(
        get_meta_client(),
        get_tiktok_client(),
        get_youtube_client(),
        get_ga4_client(),
    )


@router.post("/audit")
async def run_full_audit(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.run_full_audit(db)
    return result


@router.get("/")
async def get_channel_page_data(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns {platformStats, engagementData30, formatBreakdown} for ChannelAudit page."""
    user, client, role = ctx
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # Get all own brand channels
    channels_result = await db.execute(
        select(SocialChannel).where(SocialChannel.owner_type == "own", SocialChannel.client_id == client.id)
    )
    channels = channels_result.scalars().all()

    platform_stats = []
    all_engagement_data = {}
    all_format_data = {}

    for channel in channels:
        # Get metrics for last 30 days
        metrics_result = await db.execute(
            select(ChannelMetric)
            .where(
                ChannelMetric.channel_id == channel.id,
                ChannelMetric.date >= thirty_days_ago,
            )
            .order_by(ChannelMetric.date.desc())
        )
        metrics = metrics_result.scalars().all()

        if not metrics:
            continue

        latest = metrics[0]
        oldest = metrics[-1]

        # Build platform stat
        platform_stats.append({
            "platform": channel.platform,
            "followers": latest.followers,
            "prevFollowers": oldest.followers,
            "engagement": round(latest.engagement_rate, 1),
            "prevEngagement": round(oldest.engagement_rate, 1),
            "reach": latest.avg_reach,
            "icon": "Users",
        })

        # Aggregate engagement data by date
        for m in metrics:
            date_str = m.date.isoformat()
            if date_str not in all_engagement_data:
                all_engagement_data[date_str] = {"date": date_str, "engagement": 0, "reach": 0}
            all_engagement_data[date_str]["engagement"] += int(m.engagement_rate * m.followers / 100) if m.followers else 0
            all_engagement_data[date_str]["reach"] += m.avg_reach

        # Aggregate format breakdown from latest metric
        if latest.format_breakdown and isinstance(latest.format_breakdown, dict):
            for fmt, data in latest.format_breakdown.items():
                if fmt not in all_format_data:
                    all_format_data[fmt] = {"type": fmt, "share": 0, "posts": 0, "avgEngagement": 0.0, "count": 0}
                if isinstance(data, dict):
                    all_format_data[fmt]["posts"] += data.get("posts", 0)
                    all_format_data[fmt]["avgEngagement"] += data.get("engagement", 0)
                    all_format_data[fmt]["count"] += 1

    # Sort engagement data by date
    engagement_data_30 = sorted(all_engagement_data.values(), key=lambda x: x["date"])

    # Calculate format breakdown shares
    total_posts = sum(f["posts"] for f in all_format_data.values()) or 1
    format_breakdown = []
    for fmt_data in sorted(all_format_data.values(), key=lambda x: x["posts"], reverse=True):
        fmt_data["share"] = round(fmt_data["posts"] / total_posts * 100)
        if fmt_data["count"] > 0:
            fmt_data["avgEngagement"] = round(fmt_data["avgEngagement"] / fmt_data["count"], 1)
        del fmt_data["count"]
        format_breakdown.append(fmt_data)

    has_data = len(platform_stats) > 0

    return {
        "hasData": has_data,
        "platformStats": platform_stats,
        "engagementData30": engagement_data_30,
        "formatBreakdown": format_breakdown,
    }


@router.get("/{channel_id}")
async def audit_channel(
    channel_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.audit_channel(db, channel_id)
    return result
