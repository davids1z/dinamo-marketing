from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta

from app.database import get_db
from app.dependencies import get_meta_client, get_youtube_client
from app.services.competitor_intel import CompetitorIntelService
from app.models.competitor import Competitor, CompetitorMetric
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
async def scan_all_competitors(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.scan_all_competitors(db)
    return result


@router.get("/")
async def get_competitor_page_data(db: AsyncSession = Depends(get_db)):
    """BFF endpoint: returns {competitors, dinamoIg, summary} for the Competitors page."""

    # Get Dinamo's own IG followers
    dinamo_ig_result = await db.execute(
        select(ChannelMetric)
        .join(SocialChannel, ChannelMetric.channel_id == SocialChannel.id)
        .where(
            SocialChannel.owner_type == "dinamo",
            SocialChannel.platform == "instagram",
        )
        .order_by(ChannelMetric.date.desc())
        .limit(1)
    )
    dinamo_ig_metric = dinamo_ig_result.scalar_one_or_none()
    dinamo_ig = dinamo_ig_metric.followers if dinamo_ig_metric else 567000
    dinamo_engagement = dinamo_ig_metric.engagement_rate if dinamo_ig_metric else 3.2

    # Get latest competitor metrics (grouped by competitor + platform)
    latest_subq = (
        select(
            CompetitorMetric.competitor_id,
            CompetitorMetric.platform,
            func.max(CompetitorMetric.date).label("max_date"),
        )
        .group_by(CompetitorMetric.competitor_id, CompetitorMetric.platform)
        .subquery()
    )

    result = await db.execute(
        select(CompetitorMetric, Competitor)
        .join(Competitor, CompetitorMetric.competitor_id == Competitor.id)
        .join(
            latest_subq,
            (CompetitorMetric.competitor_id == latest_subq.c.competitor_id)
            & (CompetitorMetric.platform == latest_subq.c.platform)
            & (CompetitorMetric.date == latest_subq.c.max_date),
        )
    )
    rows = result.all()

    # Group metrics by competitor
    comp_data = {}
    for metric, comp in rows:
        if comp.name not in comp_data:
            comp_data[comp.name] = {
                "club": comp.name,
                "country": comp.country,
                "igFollowers": 0,
                "igEngagement": 0.0,
                "tiktokFollowers": 0,
            }
        if metric.platform == "instagram":
            comp_data[comp.name]["igFollowers"] = metric.followers
            comp_data[comp.name]["igEngagement"] = round(metric.engagement_rate, 1)
        elif metric.platform == "tiktok":
            comp_data[comp.name]["tiktokFollowers"] = metric.followers
        elif metric.platform == "youtube":
            # Use youtube as tiktok fallback if tiktok is 0
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
        c["gapVsDinamo"] = ig - dinamo_ig
        competitors.append(c)

    # Sort: aspirational first (desc by followers), then stretch, then direct
    tier_order = {"aspirational": 0, "stretch": 1, "direct": 2}
    competitors.sort(key=lambda x: (tier_order.get(x["tier"], 3), -x["igFollowers"]))

    # Calculate summary
    direct_comps = [c for c in competitors if c["tier"] == "direct"]
    direct_count = len(direct_comps)
    dinamo_leads_in = sum(1 for c in direct_comps if c["igFollowers"] < dinamo_ig)
    avg_engagement_direct = round(
        sum(c["igEngagement"] for c in direct_comps) / max(direct_count, 1), 1
    )

    def format_followers(n):
        if n >= 1_000_000:
            return f"{n / 1_000_000:.1f}M"
        return f"{n // 1000}K"

    summary = {
        "directCount": direct_count,
        "dinamoLeadsIn": dinamo_leads_in,
        "dinamoIgFormatted": format_followers(dinamo_ig),
        "dinamoRank": f"#1 u direktnoj skupini" if dinamo_leads_in == direct_count else f"#{direct_count - dinamo_leads_in + 1} u direktnoj skupini",
        "avgEngagementDirect": avg_engagement_direct,
        "dinamoEngagement": round(dinamo_engagement, 1),
    }

    return {
        "competitors": competitors,
        "dinamoIg": dinamo_ig,
        "summary": summary,
    }


@router.get("/alerts")
async def check_competitor_alerts(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.check_competitor_alerts(db)
    return result
