import logging
import random
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database import get_db
from app.dependencies import (
    get_current_project, get_current_client,
    get_meta_client, get_tiktok_client, get_claude_client, get_content_creator,
)
from app.services.campaign_manager import CampaignManagerService

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_service():
    return CampaignManagerService(
        get_meta_client(),
        get_tiktok_client(),
        get_claude_client(),
        content_creator=get_content_creator(),
    )


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CAMPAIGN_TEMPLATES = [
    {
        "name": "Brand Awareness — Proljeće 2026",
        "platform": "meta",
        "objective": "awareness",
        "daily_budget": 25.0,
        "max_budget": 750.0,
    },
    {
        "name": "Konverzije — Web shop akcija",
        "platform": "meta",
        "objective": "conversions",
        "daily_budget": 40.0,
        "max_budget": 1200.0,
    },
    {
        "name": "Engagement — Instagram Reels",
        "platform": "meta",
        "objective": "engagement",
        "daily_budget": 15.0,
        "max_budget": 450.0,
    },
    {
        "name": "TikTok Doseg — Gen Z publika",
        "platform": "tiktok",
        "objective": "awareness",
        "daily_budget": 20.0,
        "max_budget": 600.0,
    },
    {
        "name": "Remarketing — Aktivni posjetitelji",
        "platform": "meta",
        "objective": "conversions",
        "daily_budget": 30.0,
        "max_budget": 900.0,
    },
    {
        "name": "YouTube Pre-roll — Video kampanja",
        "platform": "youtube",
        "objective": "awareness",
        "daily_budget": 35.0,
        "max_budget": 1050.0,
    },
]

PLATFORM_DISPLAY = {
    "meta": "Meta (IG + FB)",
    "tiktok": "TikTok",
    "youtube": "YouTube",
    "google": "Google Ads",
}

AI_ADVICE_POOL = [
    "Kampanja \"{name}\" ima ROAS od {roas}x — svaki uloženi euro donosi {roas}€ natrag. {action}",
    "CTR od {ctr}% na \"{name}\" je {quality} industrijskog prosjeka (1.9%). {action}",
    "Preostalo je {budget_left}% budžeta za \"{name}\". {action}",
    "Varijanta {best_variant} na \"{name}\" ima {variant_lift}% bolji CTR od ostalih. Razmislite o gašenju slabijih varijanti.",
    "Platforma {platform} generira {platform_share}% ukupnih konverzija. {action}",
]

ALERT_TEMPLATES = {
    "low_roas": {
        "severity": "critical",
        "icon": "AlertTriangle",
        "title": "Nizak ROAS — preporuka za gašenje",
        "template": "Kampanja \"{name}\" ima ROAS od samo {roas}x. AI preporučuje pauziranje i realokaciju budžeta na kampanje s boljim povratom.",
    },
    "budget_exhausting": {
        "severity": "warning",
        "icon": "CreditCard",
        "title": "Budžet se troši brzo",
        "template": "Kampanja \"{name}\" je potrošila {spent_pct}% budžeta s preostalih {days_left} dana. Razmotrite povećanje budžeta ili optimizaciju ciljanja.",
    },
    "high_performer": {
        "severity": "success",
        "icon": "TrendingUp",
        "title": "Izvrsna kampanja — skaliranje",
        "template": "Kampanja \"{name}\" postiže ROAS od {roas}x. AI preporučuje povećanje dnevnog budžeta za {increase}% za dodatni povrat.",
    },
}


# ---------------------------------------------------------------------------
# Estimate data generator (BFF pattern)
# ---------------------------------------------------------------------------

def _generate_estimate_data(client_id, client_name: str, connected_platforms: list[str]) -> dict:
    """Generate realistic campaign estimate data when no Campaign records exist."""
    rng = random.Random(f"campaigns-{client_id}")

    num_platforms = max(len(connected_platforms), 1)
    today = date.today()

    # Pick 3-5 campaigns from templates
    num_campaigns = min(rng.randint(3, 5), len(CAMPAIGN_TEMPLATES))
    selected_templates = rng.sample(CAMPAIGN_TEMPLATES, num_campaigns)

    campaigns = []
    all_spend = 0.0
    all_roas_weighted = 0.0
    all_impressions = 0
    all_clicks = 0
    all_conversions = 0
    platform_stats = {}

    for idx, tmpl in enumerate(selected_templates):
        # Simulate campaign lifecycle
        days_running = rng.randint(5, 25)
        start_date = today - timedelta(days=days_running)
        end_date = start_date + timedelta(days=30)

        status = rng.choices(["active", "paused", "active", "active"], k=1)[0]
        if idx == len(selected_templates) - 1 and all(c["status"] != "paused" for c in campaigns):
            status = "paused"  # ensure at least one paused

        daily_budget = tmpl["daily_budget"] * rng.uniform(0.8, 1.3)
        max_budget = tmpl["max_budget"] * rng.uniform(0.85, 1.2)
        spend = daily_budget * days_running * rng.uniform(0.7, 1.0)
        spend = min(spend, max_budget * 0.92)

        impressions = int(spend * rng.uniform(80, 250))
        clicks = int(impressions * rng.uniform(0.01, 0.06))
        ctr = round((clicks / max(impressions, 1)) * 100, 2)
        conversions = int(clicks * rng.uniform(0.02, 0.12))
        revenue = conversions * rng.uniform(15, 65)
        roas = round(revenue / max(spend, 1), 1)

        # AI health score (0-100)
        health_score = 50
        if roas >= 4.0:
            health_score += 30
        elif roas >= 2.5:
            health_score += 15
        elif roas < 1.5:
            health_score -= 20

        if ctr >= 3.0:
            health_score += 15
        elif ctr >= 2.0:
            health_score += 5
        elif ctr < 1.0:
            health_score -= 10

        budget_util = spend / max(max_budget, 1)
        if 0.4 <= budget_util <= 0.8:
            health_score += 5

        health_score = max(10, min(100, health_score + rng.randint(-5, 10)))

        # Generate 3 ad variants
        variant_labels = ["A", "B", "C"]
        ad_variants = []
        winner_idx = rng.randint(0, 2)

        for v_idx, label in enumerate(variant_labels):
            v_impressions = int(impressions / 3 * rng.uniform(0.8, 1.3))
            v_clicks = int(v_impressions * rng.uniform(0.012, 0.055))
            v_ctr = round((v_clicks / max(v_impressions, 1)) * 100, 2)
            v_spend = round(spend / 3 * rng.uniform(0.75, 1.3), 2)
            v_conversions = int(v_clicks * rng.uniform(0.02, 0.1))
            v_revenue = v_conversions * rng.uniform(15, 60)
            v_roas = round(v_revenue / max(v_spend, 1), 1)

            if v_idx == winner_idx:
                v_ctr = round(v_ctr * rng.uniform(1.2, 1.8), 2)
                v_roas = round(v_roas * rng.uniform(1.3, 1.7), 1)

            headlines = [
                f"Otkrijte {client_name} — Nova kolekcija",
                f"{client_name}: Posebna ponuda",
                f"Vaš stil, naš {client_name}",
                f"Ekskluzivno za vas — {client_name}",
                f"{client_name} — Isprobajte besplatno",
                f"Spremni za promjenu? {client_name}",
            ]
            descriptions = [
                "Iskoristite ograničenu ponudu i uštedite do 30%. Besplatna dostava!",
                "Pridružite se tisućama zadovoljnih korisnika. Registrirajte se danas.",
                "Premium kvaliteta po pristupačnoj cijeni. Naručite sada!",
                "Nova sezona, novi look. Pogledajte najnovije proizvode.",
                "Ekskluzivni popust samo za pratitelje. Koristite kod: SOCIAL20",
                "Rezultati u 7 dana ili novac natrag. Bez rizika.",
            ]

            ad_variants.append({
                "variant_label": label,
                "headline": rng.choice(headlines),
                "description": rng.choice(descriptions),
                "status": "winner" if v_idx == winner_idx else "active",
                "impressions": v_impressions,
                "clicks": v_clicks,
                "ctr": v_ctr,
                "spend": v_spend,
                "conversions": v_conversions,
                "roas": v_roas,
            })

        # Daily spend trend (last 7 days)
        daily_metrics = []
        days_hr = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"]
        for d in range(7):
            day_date = today - timedelta(days=6 - d)
            day_spend = daily_budget * rng.uniform(0.5, 1.4)
            day_impressions = int(day_spend * rng.uniform(80, 200))
            day_clicks = int(day_impressions * rng.uniform(0.015, 0.045))
            day_conversions = int(day_clicks * rng.uniform(0.02, 0.08))
            daily_metrics.append({
                "date": day_date.isoformat(),
                "day_label": days_hr[day_date.weekday()],
                "spend": round(day_spend, 2),
                "impressions": day_impressions,
                "clicks": day_clicks,
                "conversions": day_conversions,
            })

        campaign = {
            "id": f"est_{idx}_{client_id}",
            "name": tmpl["name"],
            "platform": tmpl["platform"],
            "platform_label": PLATFORM_DISPLAY.get(tmpl["platform"], tmpl["platform"]),
            "objective": tmpl["objective"],
            "status": status,
            "daily_budget": round(daily_budget, 2),
            "max_budget": round(max_budget, 2),
            "spend": round(spend, 2),
            "impressions": impressions,
            "clicks": clicks,
            "ctr": ctr,
            "conversions": conversions,
            "roas": roas,
            "health_score": health_score,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days_running": days_running,
            "budget_utilization": round(budget_util * 100, 1),
            "ad_variants": ad_variants,
            "daily_metrics": daily_metrics,
        }
        campaigns.append(campaign)

        # Aggregate
        all_spend += spend
        all_roas_weighted += roas * spend
        all_impressions += impressions
        all_clicks += clicks
        all_conversions += conversions

        platform = tmpl["platform"]
        if platform not in platform_stats:
            platform_stats[platform] = {
                "platform": platform,
                "label": PLATFORM_DISPLAY.get(platform, platform),
                "spend": 0,
                "impressions": 0,
                "clicks": 0,
                "conversions": 0,
                "roas_sum": 0,
                "count": 0,
            }
        platform_stats[platform]["spend"] += spend
        platform_stats[platform]["impressions"] += impressions
        platform_stats[platform]["clicks"] += clicks
        platform_stats[platform]["conversions"] += conversions
        platform_stats[platform]["roas_sum"] += roas
        platform_stats[platform]["count"] += 1

    # Summary KPIs
    active_count = sum(1 for c in campaigns if c["status"] == "active")
    paused_count = sum(1 for c in campaigns if c["status"] == "paused")
    avg_roas = round(all_roas_weighted / max(all_spend, 1), 1)
    avg_ctr = round((all_clicks / max(all_impressions, 1)) * 100, 2)
    total_conversions = all_conversions
    cost_per_conversion = round(all_spend / max(all_conversions, 1), 2)

    # Platform comparison
    platform_comparison = []
    for ps in platform_stats.values():
        ps_ctr = round((ps["clicks"] / max(ps["impressions"], 1)) * 100, 2)
        ps_roas = round(ps["roas_sum"] / max(ps["count"], 1), 1)
        platform_comparison.append({
            "platform": ps["platform"],
            "label": ps["label"],
            "spend": round(ps["spend"], 2),
            "impressions": ps["impressions"],
            "clicks": ps["clicks"],
            "ctr": ps_ctr,
            "conversions": ps["conversions"],
            "roas": ps_roas,
            "spend_share": round((ps["spend"] / max(all_spend, 1)) * 100, 1),
        })

    # Sort by ROAS descending
    platform_comparison.sort(key=lambda x: x["roas"], reverse=True)

    # Alerts
    alerts = []
    for c in campaigns:
        if c["roas"] < 2.0 and c["status"] == "active":
            alerts.append({
                "campaign_id": c["id"],
                "campaign_name": c["name"],
                "severity": "critical",
                "icon": "AlertTriangle",
                "title": ALERT_TEMPLATES["low_roas"]["title"],
                "message": ALERT_TEMPLATES["low_roas"]["template"].format(
                    name=c["name"], roas=c["roas"]
                ),
            })
        if c["budget_utilization"] > 85 and c["status"] == "active":
            days_left = max(0, (date.fromisoformat(c["end_date"]) - today).days)
            alerts.append({
                "campaign_id": c["id"],
                "campaign_name": c["name"],
                "severity": "warning",
                "icon": "CreditCard",
                "title": ALERT_TEMPLATES["budget_exhausting"]["title"],
                "message": ALERT_TEMPLATES["budget_exhausting"]["template"].format(
                    name=c["name"], spent_pct=round(c["budget_utilization"]),
                    days_left=days_left,
                ),
            })
        if c["roas"] >= 4.0 and c["status"] == "active":
            increase = rng.randint(20, 50)
            alerts.append({
                "campaign_id": c["id"],
                "campaign_name": c["name"],
                "severity": "success",
                "icon": "TrendingUp",
                "title": ALERT_TEMPLATES["high_performer"]["title"],
                "message": ALERT_TEMPLATES["high_performer"]["template"].format(
                    name=c["name"], roas=c["roas"], increase=increase
                ),
            })

    # AI advice
    best_campaign = max(campaigns, key=lambda c: c["roas"])
    worst_campaign = min(campaigns, key=lambda c: c["roas"])
    best_platform = platform_comparison[0] if platform_comparison else None

    ai_advice = {
        "title": "AI Media Buyer — Preporuke",
        "insights": [],
    }

    ai_advice["insights"].append({
        "icon": "Trophy",
        "text": f"Kampanja \"{best_campaign['name']}\" je vaš top performer s ROAS-om od {best_campaign['roas']}x. "
                f"Svaki uloženi euro donosi {best_campaign['roas']}€ prihoda natrag.",
        "type": "success",
    })

    if worst_campaign["roas"] < 2.0:
        ai_advice["insights"].append({
            "icon": "AlertTriangle",
            "text": f"Kampanja \"{worst_campaign['name']}\" ima nizak ROAS ({worst_campaign['roas']}x). "
                    f"Prebacite {int(worst_campaign['daily_budget'])}€/dan s ove kampanje na \"{best_campaign['name']}\" za bolji povrat.",
            "type": "warning",
        })

    if best_platform:
        ai_advice["insights"].append({
            "icon": "BarChart3",
            "text": f"{best_platform['label']} donosi najbolji ROAS ({best_platform['roas']}x) "
                    f"s {best_platform['spend_share']}% ukupne potrošnje. Razmotrite povećanje alokacije.",
            "type": "info",
        })

    ai_advice["insights"].append({
        "icon": "Lightbulb",
        "text": f"Prosječni CTR od {avg_ctr}% je {'iznad' if avg_ctr > 1.9 else 'ispod'} industrijskog prosjeka (1.9%). "
                f"{'Nastavite s trenutnom strategijom kreativa.' if avg_ctr > 1.9 else 'Testirajte nove kreative i kopije za poboljšanje.'}",
        "type": "info" if avg_ctr > 1.9 else "warning",
    })

    # Monthly spend trend (last 6 months)
    monthly_trend = []
    month_names = ["Lis", "Stu", "Pro", "Sij", "Velj", "Ožu"]
    base_monthly_spend = all_spend * 0.6
    for i, month in enumerate(month_names):
        growth_factor = 1.0 + (i * rng.uniform(0.03, 0.08))
        m_spend = base_monthly_spend * growth_factor * rng.uniform(0.85, 1.15)
        m_roas = avg_roas * rng.uniform(0.8, 1.3)
        m_conversions = int(total_conversions * growth_factor * rng.uniform(0.7, 1.3) / 6)
        monthly_trend.append({
            "month": month,
            "spend": round(m_spend, 2),
            "roas": round(m_roas, 1),
            "conversions": m_conversions,
        })

    return {
        "campaigns": campaigns,
        "summary": {
            "active_campaigns": active_count,
            "paused_campaigns": paused_count,
            "total_campaigns": len(campaigns),
            "total_spend": round(all_spend, 2),
            "avg_roas": avg_roas,
            "avg_ctr": avg_ctr,
            "total_impressions": all_impressions,
            "total_clicks": all_clicks,
            "total_conversions": total_conversions,
            "cost_per_conversion": cost_per_conversion,
        },
        "platform_comparison": platform_comparison,
        "monthly_trend": monthly_trend,
        "alerts": alerts,
        "ai_advice": ai_advice,
        "_meta": {
            "is_estimate": True,
            "connected_platforms": connected_platforms,
            "analyzed_at": datetime.utcnow().isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# BFF endpoint — all page data in one call
# ---------------------------------------------------------------------------

@router.get("/page-data")
async def get_page_data(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Return all campaign page data. Reads real AdMetric aggregates from DB.
    Falls back to estimate data when no DB campaigns exist but client has social handles."""
    user, client, role = ctx

    from app.models import Campaign, Ad, AdSet
    from app.models.analytics import AdMetric

    # Check for real campaigns
    query = select(func.count()).select_from(Campaign).where(Campaign.client_id == client.id)
    res = await db.execute(query)
    count = res.scalar() or 0

    if count > 0:
        # ------------------------------------------------------------------
        # Real data path: fetch campaigns + aggregate AdMetrics per campaign
        # ------------------------------------------------------------------
        q = select(Campaign).where(Campaign.client_id == client.id).order_by(Campaign.created_at.desc())
        result = await db.execute(q)
        real_campaigns = result.scalars().all()

        campaigns_list = []
        all_spend = 0.0
        all_impressions = 0
        all_clicks = 0
        all_conversions = 0
        all_conversion_value = 0.0
        roas_weighted_sum = 0.0
        platform_stats: dict = {}

        today = date.today()

        for c in real_campaigns:
            campaign_id = c.id

            # Aggregate AdMetrics for all ads belonging to this campaign
            agg_q = (
                select(
                    func.sum(AdMetric.spend).label("total_spend"),
                    func.sum(AdMetric.impressions).label("total_impressions"),
                    func.sum(AdMetric.clicks).label("total_clicks"),
                    func.sum(AdMetric.conversions).label("total_conversions"),
                    func.sum(AdMetric.conversion_value).label("total_conversion_value"),
                )
                .join(Ad, AdMetric.ad_id == Ad.id)
                .join(AdSet, Ad.ad_set_id == AdSet.id)
                .where(AdSet.campaign_id == campaign_id)
            )
            agg_res = await db.execute(agg_q)
            agg = agg_res.one()

            c_spend = float(agg.total_spend or 0) or float(c.total_spend or 0)
            c_impressions = int(agg.total_impressions or 0)
            c_clicks = int(agg.total_clicks or 0)
            c_conversions = int(agg.total_conversions or 0)
            c_conversion_value = float(agg.total_conversion_value or 0)

            c_ctr = round((c_clicks / max(c_impressions, 1)) * 100, 2)
            c_roas = round(c_conversion_value / max(c_spend, 0.01), 2)
            c_max_budget = float(c.max_budget or 0)
            c_daily_budget = float(c.daily_budget or 0)
            budget_util = round((c_spend / max(c_max_budget, 0.01)) * 100, 1)
            days_running = (today - c.start_date).days if c.start_date else 0

            # Per-ad variant aggregates (for detail view)
            variants_q = (
                select(
                    Ad.id,
                    Ad.variant_label,
                    Ad.headline,
                    Ad.status,
                    func.sum(AdMetric.impressions).label("impressions"),
                    func.sum(AdMetric.clicks).label("clicks"),
                    func.sum(AdMetric.spend).label("spend"),
                    func.sum(AdMetric.conversions).label("conversions"),
                    func.sum(AdMetric.conversion_value).label("conversion_value"),
                )
                .join(AdMetric, AdMetric.ad_id == Ad.id, isouter=True)
                .join(AdSet, Ad.ad_set_id == AdSet.id)
                .where(AdSet.campaign_id == campaign_id)
                .group_by(Ad.id, Ad.variant_label, Ad.headline, Ad.status)
            )
            variants_res = await db.execute(variants_q)
            variants_rows = variants_res.all()

            ad_variants = []
            for row in variants_rows:
                v_impressions = int(row.impressions or 0)
                v_clicks = int(row.clicks or 0)
                v_spend = float(row.spend or 0)
                v_conversions = int(row.conversions or 0)
                v_conversion_value = float(row.conversion_value or 0)
                v_ctr = round((v_clicks / max(v_impressions, 1)) * 100, 2)
                v_roas = round(v_conversion_value / max(v_spend, 0.01), 2)
                ad_variants.append({
                    "variant_label": row.variant_label,
                    "headline": row.headline,
                    "description": "",
                    "status": row.status,
                    "impressions": v_impressions,
                    "clicks": v_clicks,
                    "ctr": v_ctr,
                    "spend": round(v_spend, 2),
                    "conversions": v_conversions,
                    "roas": v_roas,
                })

            # Daily metrics for last 7 days
            daily_q = (
                select(
                    func.date_trunc("day", AdMetric.timestamp).label("day"),
                    func.sum(AdMetric.impressions).label("impressions"),
                    func.sum(AdMetric.clicks).label("clicks"),
                    func.sum(AdMetric.spend).label("spend"),
                    func.sum(AdMetric.conversions).label("conversions"),
                )
                .join(Ad, AdMetric.ad_id == Ad.id)
                .join(AdSet, Ad.ad_set_id == AdSet.id)
                .where(AdSet.campaign_id == campaign_id)
                .group_by(func.date_trunc("day", AdMetric.timestamp))
                .order_by(func.date_trunc("day", AdMetric.timestamp).desc())
                .limit(7)
            )
            daily_res = await db.execute(daily_q)
            daily_rows = list(reversed(daily_res.all()))
            days_hr = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"]
            daily_metrics = [
                {
                    "date": row.day.date().isoformat() if row.day else "",
                    "day_label": days_hr[row.day.weekday()] if row.day else "",
                    "spend": round(float(row.spend or 0), 2),
                    "impressions": int(row.impressions or 0),
                    "clicks": int(row.clicks or 0),
                    "conversions": int(row.conversions or 0),
                }
                for row in daily_rows
            ]

            # Health score
            health_score = 50
            if c_roas >= 4.0:
                health_score += 30
            elif c_roas >= 2.5:
                health_score += 15
            elif c_roas < 1.5 and c_roas > 0:
                health_score -= 20
            if c_ctr >= 3.0:
                health_score += 15
            elif c_ctr >= 2.0:
                health_score += 5
            elif c_ctr < 1.0 and c_ctr > 0:
                health_score -= 10
            health_score = max(10, min(100, health_score))

            campaigns_list.append({
                "id": str(c.id),
                "name": c.name,
                "platform": c.platform,
                "platform_label": PLATFORM_DISPLAY.get(c.platform, c.platform),
                "objective": c.objective or "awareness",
                "status": c.status or "draft",
                "daily_budget": round(c_daily_budget, 2),
                "max_budget": round(c_max_budget, 2),
                "spend": round(c_spend, 2),
                "impressions": c_impressions,
                "clicks": c_clicks,
                "ctr": c_ctr,
                "conversions": c_conversions,
                "roas": c_roas,
                "health_score": health_score,
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "end_date": c.end_date.isoformat() if c.end_date else None,
                "days_running": days_running,
                "budget_utilization": budget_util,
                "ad_variants": ad_variants,
                "daily_metrics": daily_metrics,
            })

            # Global aggregates
            all_spend += c_spend
            all_impressions += c_impressions
            all_clicks += c_clicks
            all_conversions += c_conversions
            all_conversion_value += c_conversion_value
            roas_weighted_sum += c_roas * c_spend

            # Platform stats
            plat = c.platform
            if plat not in platform_stats:
                platform_stats[plat] = {
                    "platform": plat,
                    "label": PLATFORM_DISPLAY.get(plat, plat),
                    "spend": 0.0,
                    "impressions": 0,
                    "clicks": 0,
                    "conversions": 0,
                    "roas_sum": 0.0,
                    "count": 0,
                }
            platform_stats[plat]["spend"] += c_spend
            platform_stats[plat]["impressions"] += c_impressions
            platform_stats[plat]["clicks"] += c_clicks
            platform_stats[plat]["conversions"] += c_conversions
            platform_stats[plat]["roas_sum"] += c_roas
            platform_stats[plat]["count"] += 1

        # Summary KPIs
        active_count = sum(1 for c in campaigns_list if c["status"] == "active")
        paused_count = sum(1 for c in campaigns_list if c["status"] == "paused")
        avg_roas = round(roas_weighted_sum / max(all_spend, 0.01), 2) if all_spend > 0 else 0.0
        avg_ctr = round((all_clicks / max(all_impressions, 1)) * 100, 2)
        cost_per_conversion = round(all_spend / max(all_conversions, 1), 2) if all_conversions > 0 else 0.0

        # Platform comparison
        platform_comparison = []
        for ps in platform_stats.values():
            ps_ctr = round((ps["clicks"] / max(ps["impressions"], 1)) * 100, 2)
            ps_roas = round(ps["roas_sum"] / max(ps["count"], 1), 2)
            platform_comparison.append({
                "platform": ps["platform"],
                "label": ps["label"],
                "spend": round(ps["spend"], 2),
                "impressions": ps["impressions"],
                "clicks": ps["clicks"],
                "ctr": ps_ctr,
                "conversions": ps["conversions"],
                "roas": ps_roas,
                "spend_share": round((ps["spend"] / max(all_spend, 0.01)) * 100, 1),
            })
        platform_comparison.sort(key=lambda x: x["roas"], reverse=True)

        # Monthly trend (last 6 months from AdMetrics)
        from sqlalchemy import text as sa_text
        monthly_q = (
            select(
                func.date_trunc("month", AdMetric.timestamp).label("month"),
                func.sum(AdMetric.spend).label("spend"),
                func.sum(AdMetric.conversions).label("conversions"),
                func.sum(AdMetric.conversion_value).label("conversion_value"),
            )
            .join(Ad, AdMetric.ad_id == Ad.id)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .join(Campaign, AdSet.campaign_id == Campaign.id)
            .where(Campaign.client_id == client.id)
            .group_by(func.date_trunc("month", AdMetric.timestamp))
            .order_by(func.date_trunc("month", AdMetric.timestamp).desc())
            .limit(6)
        )
        monthly_res = await db.execute(monthly_q)
        monthly_rows = list(reversed(monthly_res.all()))

        month_labels = ["Sij", "Velj", "Ožu", "Tra", "Svi", "Lip",
                        "Srp", "Kol", "Ruj", "Lis", "Stu", "Pro"]
        monthly_trend = [
            {
                "month": month_labels[row.month.month - 1] if row.month else "?",
                "spend": round(float(row.spend or 0), 2),
                "roas": round(float(row.conversion_value or 0) / max(float(row.spend or 0), 0.01), 2),
                "conversions": int(row.conversions or 0),
            }
            for row in monthly_rows
        ]

        # Alerts
        alerts = []
        for c in campaigns_list:
            if c["roas"] > 0 and c["roas"] < 2.0 and c["status"] == "active":
                alerts.append({
                    "campaign_id": c["id"],
                    "campaign_name": c["name"],
                    "severity": "critical",
                    "icon": "AlertTriangle",
                    "title": ALERT_TEMPLATES["low_roas"]["title"],
                    "message": ALERT_TEMPLATES["low_roas"]["template"].format(
                        name=c["name"], roas=c["roas"]
                    ),
                })
            if c["budget_utilization"] > 85 and c["status"] == "active":
                days_left = max(0, (date.fromisoformat(c["end_date"]) - today).days) if c["end_date"] else 0
                alerts.append({
                    "campaign_id": c["id"],
                    "campaign_name": c["name"],
                    "severity": "warning",
                    "icon": "CreditCard",
                    "title": ALERT_TEMPLATES["budget_exhausting"]["title"],
                    "message": ALERT_TEMPLATES["budget_exhausting"]["template"].format(
                        name=c["name"], spent_pct=round(c["budget_utilization"]),
                        days_left=days_left,
                    ),
                })
            if c["roas"] >= 4.0 and c["status"] == "active":
                import random as _rng
                alerts.append({
                    "campaign_id": c["id"],
                    "campaign_name": c["name"],
                    "severity": "success",
                    "icon": "TrendingUp",
                    "title": ALERT_TEMPLATES["high_performer"]["title"],
                    "message": ALERT_TEMPLATES["high_performer"]["template"].format(
                        name=c["name"], roas=c["roas"], increase=_rng.randint(20, 50)
                    ),
                })

        # AI advice
        ai_advice = {"title": "AI Media Buyer — Preporuke", "insights": []}
        if campaigns_list:
            best = max(campaigns_list, key=lambda c: c["roas"])
            worst = min(campaigns_list, key=lambda c: c["roas"])
            best_name = best["name"]
            worst_name = worst["name"]
            ai_advice["insights"].append({
                "icon": "Trophy",
                "text": (
                    f"Kampanja '{best_name}' je vaš top performer s ROAS-om od {best['roas']}x. "
                    f"Svaki uloženi euro donosi {best['roas']}€ prihoda natrag."
                ),
                "type": "success",
            })
            if worst["roas"] < 2.0 and worst["roas"] > 0:
                ai_advice["insights"].append({
                    "icon": "AlertTriangle",
                    "text": (
                        f"Kampanja '{worst_name}' ima nizak ROAS ({worst['roas']}x). "
                        f"Razmotrite realokaciju budžeta na bolje kampanje."
                    ),
                    "type": "warning",
                })
            if platform_comparison:
                best_plat = platform_comparison[0]
                best_plat_label = best_plat["label"]
                ai_advice["insights"].append({
                    "icon": "BarChart3",
                    "text": (
                        f"{best_plat_label} donosi najbolji ROAS ({best_plat['roas']}x) "
                        f"s {best_plat['spend_share']}% ukupne potrošnje."
                    ),
                    "type": "info",
                })
            ctr_status = "iznad" if avg_ctr > 1.9 else "ispod"
            ctr_advice = "Nastavite s trenutnom strategijom kreativa." if avg_ctr > 1.9 else "Testirajte nove kreative i kopije za poboljšanje."
            ai_advice["insights"].append({
                "icon": "Lightbulb",
                "text": (
                    f"Prosječni CTR od {avg_ctr}% je {ctr_status} industrijskog prosjeka (1.9%). "
                    f"{ctr_advice}"
                ),
                "type": "info" if avg_ctr > 1.9 else "warning",
            })
        return {
            "campaigns": campaigns_list,
            "summary": {
                "active_campaigns": active_count,
                "paused_campaigns": paused_count,
                "total_campaigns": len(campaigns_list),
                "total_spend": round(all_spend, 2),
                "avg_roas": avg_roas,
                "avg_ctr": avg_ctr,
                "total_impressions": all_impressions,
                "total_clicks": all_clicks,
                "total_conversions": all_conversions,
                "cost_per_conversion": cost_per_conversion,
            },
            "platform_comparison": platform_comparison,
            "monthly_trend": monthly_trend,
            "alerts": alerts,
            "ai_advice": ai_advice,
            "_meta": {
                "is_estimate": False,
                "connected_platforms": list(platform_stats.keys()),
                "analyzed_at": datetime.utcnow().isoformat(),
            },
        }

    # ------------------------------------------------------------------
    # No real campaigns — use estimate data if client has social handles
    # ------------------------------------------------------------------
    connected = []
    if client.social_handles and isinstance(client.social_handles, dict):
        connected = [k for k, v in client.social_handles.items() if v]

    if not connected:
        return {
            "campaigns": [],
            "summary": {
                "active_campaigns": 0,
                "paused_campaigns": 0,
                "total_campaigns": 0,
                "total_spend": 0,
                "avg_roas": 0,
                "avg_ctr": 0,
                "total_impressions": 0,
                "total_clicks": 0,
                "total_conversions": 0,
                "cost_per_conversion": 0,
            },
            "platform_comparison": [],
            "monthly_trend": [],
            "alerts": [],
            "ai_advice": {"title": "AI Media Buyer", "insights": []},
            "_meta": {
                "is_estimate": False,
                "connected_platforms": [],
                "analyzed_at": datetime.utcnow().isoformat(),
            },
        }

    return _generate_estimate_data(client.id, client.name, connected)


# ---------------------------------------------------------------------------
# Legacy endpoints (preserved for backwards compatibility)
# ---------------------------------------------------------------------------

@router.post("/")
async def create_campaign(
    data: dict = Body(...),
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.create_campaign(db, data)
    return result


@router.get("/")
async def list_campaigns(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import Campaign

    query = select(Campaign).where(Campaign.client_id == client.id, Campaign.project_id == project.id).order_by(Campaign.created_at.desc())
    res = await db.execute(query)
    campaigns = res.scalars().all()
    return campaigns


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import Campaign

    query = select(Campaign).where(Campaign.id == campaign_id, Campaign.client_id == client.id, Campaign.project_id == project.id)
    res = await db.execute(query)
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/{campaign_id}/performance")
async def get_campaign_performance(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed performance data with ad-level metrics."""
    user, client, project, role = ctx
    service = _get_service()
    try:
        result = await service.get_campaign_performance(db, campaign_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.pause_campaign(db, campaign_id)
    return result


@router.patch("/{campaign_id}/resume")
async def resume_campaign(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.resume_campaign(db, campaign_id)
    return result


@router.get("/{campaign_id}/ab-test")
async def get_ab_test_results(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.get_ab_test_results(db, campaign_id)
    return result


@router.post("/{campaign_id}/refresh-creative")
async def refresh_creative(
    campaign_id: UUID,
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.refresh_creative(db, campaign_id)
    return result
