from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from datetime import date, timedelta
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_client, get_meta_client, get_youtube_client
from app.services.competitor_intel import CompetitorIntelService
from app.models.competitor import Competitor, CompetitorMetric, CompetitorAlert
from app.models.channel import SocialChannel, ChannelMetric

router = APIRouter()

# Tier classification by IG followers
TIER_THRESHOLDS = {
    "aspirational": 2_000_000,
    "stretch": 500_000,
}


def _get_service():
    return CompetitorIntelService(
        get_meta_client(),
        get_youtube_client(),
    )


@router.post("/scan")
async def scan_all_competitors(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.scan_all_competitors(db)
    return result


@router.post("/discover")
async def discover_competitors(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Use AI to discover competitors based on client profile.

    Triggers the same AI discovery flow used during onboarding,
    but can be called on-demand from the Competitors page.
    """
    from app.tasks.client_intelligence import _step_d_discover_competitors

    user, client, role = ctx

    # Delete existing competitors first so discovery starts fresh
    existing = (
        await db.execute(select(Competitor).where(Competitor.client_id == client.id))
    ).scalars().all()
    for comp in existing:
        await db.execute(
            delete(CompetitorMetric).where(CompetitorMetric.competitor_id == comp.id)
        )
        await db.execute(
            delete(CompetitorAlert).where(CompetitorAlert.competitor_id == comp.id)
        )
        await db.delete(comp)
    await db.flush()

    # Run AI discovery synchronously (it uses its own sync session)
    results: dict = {"competitors_created": 0, "competitor_metrics_created": 0}
    _step_d_discover_competitors(
        client.id,
        client.business_description or "",
        client.target_audience or "",
        results,
    )

    # Fetch the newly created competitors to return to the frontend
    new_comps = (
        await db.execute(select(Competitor).where(Competitor.client_id == client.id))
    ).scalars().all()

    return {
        "discovered": len(new_comps),
        "competitors": [
            {
                "id": str(c.id),
                "name": c.name,
                "short_name": c.short_name,
                "country": c.country,
                "reason": f"Sličan poslovni profil i ciljna publika",
            }
            for c in new_comps
        ],
    }


@router.delete("/{competitor_id}")
async def remove_competitor(
    competitor_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Remove a competitor from tracking."""
    user, client, role = ctx

    comp = await db.get(Competitor, competitor_id)
    if not comp or comp.client_id != client.id:
        raise HTTPException(status_code=404, detail="Competitor not found")

    # Delete metrics and alerts first
    await db.execute(
        delete(CompetitorMetric).where(CompetitorMetric.competitor_id == competitor_id)
    )
    await db.execute(
        delete(CompetitorAlert).where(CompetitorAlert.competitor_id == competitor_id)
    )
    await db.delete(comp)
    await db.flush()

    return {"deleted": True, "id": str(competitor_id), "name": comp.name}


@router.get("/")
async def get_competitor_page_data(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns {competitors, ownIg, summary} for the Competitors page."""
    user, client, role = ctx

    # Get own brand's IG followers
    own_ig_result = await db.execute(
        select(ChannelMetric)
        .join(SocialChannel, ChannelMetric.channel_id == SocialChannel.id)
        .where(
            SocialChannel.owner_type == "own",
            SocialChannel.platform == "instagram",
            SocialChannel.client_id == client.id,
        )
        .order_by(ChannelMetric.date.desc())
        .limit(1)
    )
    own_ig_metric = own_ig_result.scalar_one_or_none()
    own_ig = own_ig_metric.followers if own_ig_metric else 0
    own_engagement = own_ig_metric.engagement_rate if own_ig_metric else 0.0

    # Own TikTok metrics
    own_tt_result = await db.execute(
        select(ChannelMetric)
        .join(SocialChannel, ChannelMetric.channel_id == SocialChannel.id)
        .where(
            SocialChannel.owner_type == "own",
            SocialChannel.platform == "tiktok",
            SocialChannel.client_id == client.id,
        )
        .order_by(ChannelMetric.date.desc())
        .limit(1)
    )
    own_tt_metric = own_tt_result.scalar_one_or_none()
    own_tiktok = own_tt_metric.followers if own_tt_metric else 0
    own_tiktok_engagement = own_tt_metric.engagement_rate if own_tt_metric else 0.0

    # Get latest competitor metrics (grouped by competitor + platform)
    latest_subq = (
        select(
            CompetitorMetric.competitor_id,
            CompetitorMetric.platform,
            func.max(CompetitorMetric.date).label("max_date"),
        )
        .join(Competitor, CompetitorMetric.competitor_id == Competitor.id)
        .where(Competitor.client_id == client.id)
        .group_by(CompetitorMetric.competitor_id, CompetitorMetric.platform)
        .subquery()
    )

    result = await db.execute(
        select(CompetitorMetric, Competitor)
        .join(Competitor, CompetitorMetric.competitor_id == Competitor.id)
        .where(Competitor.client_id == client.id)
        .join(
            latest_subq,
            (CompetitorMetric.competitor_id == latest_subq.c.competitor_id)
            & (CompetitorMetric.platform == latest_subq.c.platform)
            & (CompetitorMetric.date == latest_subq.c.max_date),
        )
    )
    rows = result.all()

    # Group metrics by competitor
    comp_data: dict = {}
    for metric, comp in rows:
        if comp.name not in comp_data:
            comp_data[comp.name] = {
                "id": str(comp.id),
                "company": comp.name,
                "country": comp.country,
                "igFollowers": 0,
                "igEngagement": 0.0,
                "tiktokFollowers": 0,
                "tiktokEngagement": 0.0,
                "followerGrowth": 0.0,
                "engagementGrowth": 0.0,
                "contentPerWeek": 0.0,
            }
        if metric.platform == "instagram":
            comp_data[comp.name]["igFollowers"] = metric.followers
            comp_data[comp.name]["igEngagement"] = round(metric.engagement_rate, 1)
            # Estimate weekly content from content_formats if available
            if metric.content_formats and isinstance(metric.content_formats, dict):
                total_content = sum(metric.content_formats.values())
                comp_data[comp.name]["contentPerWeek"] = round(total_content / 4, 1)  # monthly → weekly
        elif metric.platform == "tiktok":
            comp_data[comp.name]["tiktokFollowers"] = metric.followers
            comp_data[comp.name]["tiktokEngagement"] = round(metric.engagement_rate, 1)
        elif metric.platform == "youtube":
            if comp_data[comp.name]["tiktokFollowers"] == 0:
                comp_data[comp.name]["tiktokFollowers"] = metric.followers

    # Add tier and gap
    competitors = []
    for c in comp_data.values():
        ig = c["igFollowers"]
        if ig >= TIER_THRESHOLDS["aspirational"]:
            c["tier"] = "aspirational"
        elif ig >= TIER_THRESHOLDS["stretch"]:
            c["tier"] = "stretch"
        else:
            c["tier"] = "direct"
        c["gapVsUs"] = ig - own_ig
        competitors.append(c)

    # Sort: aspirational first (desc by followers), then stretch, then direct
    tier_order = {"aspirational": 0, "stretch": 1, "direct": 2}
    competitors.sort(key=lambda x: (tier_order.get(x["tier"], 3), -x["igFollowers"]))

    # Calculate summary
    direct_comps = [c for c in competitors if c["tier"] == "direct"]
    direct_count = len(direct_comps)
    own_leads_in = sum(1 for c in direct_comps if c["igFollowers"] < own_ig)
    avg_engagement_direct = round(
        sum(c["igEngagement"] for c in direct_comps) / max(direct_count, 1), 1
    )

    # Content gap analysis
    avg_content_per_week = (
        round(sum(c.get("contentPerWeek", 0) for c in competitors) / max(len(competitors), 1), 1)
        if competitors else 0
    )
    own_content_per_week = own_ig_metric.posting_frequency if own_ig_metric else 0.0
    content_gap_pct = round(
        ((avg_content_per_week - own_content_per_week) / max(own_content_per_week, 1)) * 100
    ) if own_content_per_week > 0 else 0

    def format_followers(n: int) -> str:
        if n >= 1_000_000:
            return f"{n / 1_000_000:.1f}M"
        return f"{n // 1000}K"

    summary = {
        "directCount": direct_count,
        "weLeadIn": own_leads_in,
        "ourIgFormatted": format_followers(own_ig),
        "ourRank": (
            f"#1 u direktnoj skupini"
            if own_leads_in == direct_count
            else f"#{direct_count - own_leads_in + 1} u direktnoj skupini"
        ),
        "avgEngagementDirect": avg_engagement_direct,
        "ourEngagement": round(own_engagement, 1),
    }

    # Content gap insight sentence
    content_gap = None
    if competitors:
        # Find what format competitors use most that we may lack
        content_gap = {
            "avgContentPerWeek": avg_content_per_week,
            "ourContentPerWeek": round(own_content_per_week, 1),
            "gapPercent": content_gap_pct,
        }

    return {
        "competitors": competitors,
        "ourIg": own_ig,
        "ourTiktok": own_tiktok,
        "ourEngagement": round(own_engagement, 1),
        "ourTiktokEngagement": round(own_tiktok_engagement, 1),
        "ourFollowerGrowth": 0.0,
        "ourEngagementGrowth": 0.0,
        "ourContentPerWeek": round(own_content_per_week, 1),
        "hasOwnData": own_ig_metric is not None,
        "contentGap": content_gap,
        "summary": summary,
    }


@router.get("/alerts")
async def check_competitor_alerts(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.check_competitor_alerts(db)
    return result
