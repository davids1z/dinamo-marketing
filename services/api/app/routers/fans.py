import logging
import random
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import date, datetime, timedelta

from app.database import get_db
from app.dependencies import get_current_client, get_claude_client
from app.services.fan_data import FanDataService

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_service():
    return FanDataService(get_claude_client())


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SEGMENTS = [
    {
        "key": "ambassador",
        "label": "Ambasadori",
        "icon": "Award",
        "color": "from-yellow-600 to-yellow-400",
        "description": "Aktivno dijele sadržaj, privlače nove pratitelje, organski promoviraju brend.",
        "clv_weight": 20.0,
        "retention": "97%",
        "churn_risk_label": "Minimalan",
    },
    {
        "key": "superfan",
        "label": "Superfanovi",
        "icon": "Star",
        "color": "from-purple-600 to-purple-400",
        "description": "Top 10% po interakcijama. Komentiraju, lajkaju i spremaju redovito.",
        "clv_weight": 12.0,
        "retention": "92%",
        "churn_risk_label": "Vrlo nizak",
    },
    {
        "key": "casual",
        "label": "Povremeni",
        "icon": "Users",
        "color": "from-blue-600 to-blue-400",
        "description": "Interagiraju 2-4 puta mjesečno. Gledaju Stories, ponekad lajkaju.",
        "clv_weight": 2.5,
        "retention": "52%",
        "churn_risk_label": "Srednji",
    },
    {
        "key": "sleeper",
        "label": "Spavači",
        "icon": "UserPlus",
        "color": "from-slate-600 to-slate-400",
        "description": "Neaktivni 30+ dana. Pratili su vas, ali ne interagiraju.",
        "clv_weight": 0.5,
        "retention": "22%",
        "churn_risk_label": "Visoki",
    },
    {
        "key": "vip_risk",
        "label": "VIP / Rizik",
        "icon": "Heart",
        "color": "from-red-600 to-red-400",
        "description": "Nekad aktivni korisnici koji naglo prestaju interagirati. Prioritet za intervenciju.",
        "clv_weight": 8.0,
        "retention": "38%",
        "churn_risk_label": "Kritičan",
    },
]

TARGETING_ADVICE = {
    "ambassador": "Ponudite im ekskluzivni pristup novim proizvodima ili early access. Kreirajte referral program gdje dobiju nagradu za svakog novog korisnika.",
    "superfan": "Uključite ih u User-Generated Content kampanje. Pošaljite personalizirane zahvale i uključite ih u beta testiranja novih proizvoda.",
    "casual": "Pošaljite im personalizirane preporuke sadržaja na temelju onoga što su lajkali. Aktivirajte ih interaktivnim formatima (ankete, kvizovi).",
    "sleeper": "Kreirajte re-engagement kampanju: 'Nedostajete nam!' email + ekskluzivni popust. Testirajte različite vremenske okvire objava.",
    "vip_risk": "HITNO: Osobni outreach putem DM-a ili emaila. Ponudite ekskluzivni benefit ili 1-na-1 razgovor. Ovi korisnici su prije bili vaši najbolji — saznajte zašto odlaze.",
}

AI_ADVICE_POOL = [
    "Segment 'Spavači' je narastao za {sleeper_pct}% — kreirajte re-engagement kampanju s ekskluzivnim popustom od 15% za ove korisnike.",
    "Vaši Ambasadori generiraju {amb_reach}x više dosega od prosječnog pratitelja. Razmislite o affiliate programu za ovu grupu.",
    "Alarm: {vip_count} VIP korisnika pokazuje znakove odljeva. Preporučujemo personalizirane DM poruke u sljedećih 48 sati.",
    "Superfanovi češće interagiraju s Reels/video sadržajem (+{video_boost}%). Povećajte udio video formata za ovu grupu.",
    "Povremeni korisnici najbolje reagiraju na ankete i interaktivni sadržaj. Objavite Story anketu danas za +25% engagement.",
    "Konverzija iz 'Povremeni' u 'Superfan' trenutno je {conv_rate}%. Cilj industrije je 12% — fokusirajte se na personalizirani sadržaj.",
    "Vaš Customer Lifetime Value raste: prosječni CLV je porastao za {clv_growth}% u zadnjih 30 dana zahvaljujući rastu Superfanovi segmenta.",
]


# ---------------------------------------------------------------------------
# Estimate data generator
# ---------------------------------------------------------------------------

def _generate_estimate_data(client_id, client_name: str, connected_platforms: list[str]) -> dict:
    """Generate realistic segmentation estimate data when no FanProfile records exist."""
    rng = random.Random(f"fans-{client_id}")

    num_platforms = len(connected_platforms)
    base_followers = int(rng.uniform(2000, 15000) * max(num_platforms, 1))

    # Segment distribution (realistic proportions)
    distribution = {
        "ambassador": rng.uniform(0.02, 0.05),
        "superfan": rng.uniform(0.08, 0.15),
        "casual": rng.uniform(0.35, 0.45),
        "sleeper": rng.uniform(0.20, 0.30),
        "vip_risk": rng.uniform(0.03, 0.08),
    }
    # Normalize to 1.0
    total_dist = sum(distribution.values())
    for k in distribution:
        distribution[k] /= total_dist

    # Build segments
    fan_segments = []
    segment_counts = {}
    for seg_def in SEGMENTS:
        key = seg_def["key"]
        count = int(base_followers * distribution.get(key, 0.1))
        growth = round(rng.uniform(-5.0, 15.0), 1)
        if key == "sleeper":
            growth = round(rng.uniform(-2.0, 8.0), 1)
        if key == "vip_risk":
            growth = round(rng.uniform(1.0, 12.0), 1)  # growing = bad (more at risk)
        if key == "ambassador":
            growth = round(rng.uniform(2.0, 18.0), 1)

        segment_counts[key] = count
        fan_segments.append({
            "stage": seg_def["label"],
            "count": count,
            "icon_name": seg_def["icon"],
            "color": seg_def["color"],
            "growth": growth,
            "description": seg_def["description"],
        })

    total_users = sum(s["count"] for s in fan_segments)

    # Funnel steps (lifecycle funnel)
    funnel_steps = [
        {"label": "Svi pratitelji", "value": total_users, "color": "#3b82f6"},
        {"label": "Povremeno aktivni", "value": int(total_users * rng.uniform(0.55, 0.70)), "color": "#6366f1"},
        {"label": "Redovito aktivni", "value": int(total_users * rng.uniform(0.20, 0.35)), "color": "#8b5cf6"},
        {"label": "Superfanovi", "value": segment_counts.get("superfan", 0), "color": "#a855f7"},
        {"label": "Ambasadori", "value": segment_counts.get("ambassador", 0), "color": "#f59e0b"},
    ]

    # CLV data
    clv_data = []
    for seg_def in SEGMENTS:
        key = seg_def["key"]
        base_clv = seg_def["clv_weight"] * rng.uniform(0.7, 1.5)
        clv_data.append({
            "segment": seg_def["label"],
            "clv": f"€{base_clv:.2f}",
            "retention": seg_def["retention"],
            "churn_risk": seg_def["churn_risk_label"],
        })

    # Churn predictions
    churn_predictions = [
        {
            "metric": "Korisnici u riziku (30+ dana neaktivni)",
            "value": str(segment_counts.get("sleeper", 0) + segment_counts.get("vip_risk", 0)),
            "trend": "down",
            "change": f"+{rng.randint(2, 8)}%",
            "description": f"CLV u riziku: €{rng.uniform(200, 1500):.2f} • Potrebna re-engagement kampanja",
        },
        {
            "metric": "Stopa zadržavanja (ukupna)",
            "value": f"{rng.uniform(62, 78):.0f}%",
            "trend": "up",
            "change": f"+{rng.uniform(1.5, 4.5):.1f}%",
            "description": "Poboljšanje u odnosu na prošli mjesec zahvaljujući redovitom sadržaju",
        },
        {
            "metric": "Konverzija u Superfan",
            "value": f"{rng.uniform(6, 14):.1f}%",
            "trend": "up",
            "change": f"+{rng.uniform(0.5, 3.0):.1f}%",
            "description": "Postotak Povremenih korisnika koji prelaze u Superfan segment mjesečno",
        },
    ]

    # Churn risk distribution (for bar chart)
    safe_pct = rng.uniform(55, 72)
    medium_pct = rng.uniform(15, 25)
    high_pct = rng.uniform(6, 14)
    critical_pct = 100 - safe_pct - medium_pct - high_pct
    churn_distribution = [
        {"name": "Minimalan", "value": round(safe_pct), "color": "#22c55e"},
        {"name": "Srednji", "value": round(medium_pct), "color": "#f59e0b"},
        {"name": "Visoki", "value": round(high_pct), "color": "#ef4444"},
        {"name": "Kritičan", "value": round(max(critical_pct, 2)), "color": "#dc2626"},
    ]

    # Growth trend data (6 months)
    growth_trend = []
    months_hr = ["Lis", "Stu", "Pro", "Sij", "Velj", "Ožu"]
    for i, month in enumerate(months_hr):
        growth_trend.append({
            "month": month,
            "ambassador": int(segment_counts.get("ambassador", 100) * (0.6 + i * 0.08) * rng.uniform(0.9, 1.1)),
            "superfan": int(segment_counts.get("superfan", 300) * (0.5 + i * 0.1) * rng.uniform(0.9, 1.1)),
            "casual": int(segment_counts.get("casual", 1000) * (0.7 + i * 0.06) * rng.uniform(0.95, 1.05)),
            "sleeper": int(segment_counts.get("sleeper", 500) * (1.1 - i * 0.02) * rng.uniform(0.9, 1.1)),
            "vip_risk": int(segment_counts.get("vip_risk", 100) * (0.8 + i * 0.04) * rng.uniform(0.85, 1.15)),
        })

    # Targeting advice per segment
    targeting = []
    for seg_def in SEGMENTS:
        key = seg_def["key"]
        targeting.append({
            "segment": seg_def["label"],
            "icon": seg_def["icon"],
            "advice": TARGETING_ADVICE.get(key, ""),
        })

    # Monetary value per segment
    monetary_values = []
    for seg_def in SEGMENTS:
        key = seg_def["key"]
        count = segment_counts.get(key, 0)
        avg_value = seg_def["clv_weight"] * rng.uniform(0.7, 1.5)
        total_value = count * avg_value
        monetary_values.append({
            "segment": seg_def["label"],
            "count": count,
            "avgValue": round(avg_value, 2),
            "totalValue": round(total_value, 2),
        })

    # AI advice of the day (deterministic per day + client)
    day_seed = f"{client_id}-fans-{date.today().isoformat()}"
    day_rng = random.Random(day_seed)
    sleeper_pct = round(distribution.get("sleeper", 0.25) * 100)
    advice_template = day_rng.choice(AI_ADVICE_POOL)
    ai_advice = advice_template.format(
        sleeper_pct=sleeper_pct,
        amb_reach=day_rng.randint(3, 8),
        vip_count=segment_counts.get("vip_risk", 0),
        video_boost=day_rng.randint(25, 55),
        conv_rate=f"{day_rng.uniform(6, 14):.1f}",
        clv_growth=f"{day_rng.uniform(3, 12):.1f}",
    )

    # Churn alert (if VIP/Risk segment is growing)
    vip_seg = next((s for s in fan_segments if s["stage"] == "VIP / Rizik"), None)
    churn_alert = None
    if vip_seg and vip_seg["growth"] > 5:
        churn_alert = {
            "severity": "high",
            "title": "Alarm za odljev korisnika",
            "message": f"{vip_seg['count']} prethodno aktivnih korisnika pokazuje znakove odljeva (rast segmenta +{vip_seg['growth']}%). Preporučujemo hitnu re-engagement kampanju.",
            "affectedCount": vip_seg["count"],
            "estimatedRevenueAtRisk": round(vip_seg["count"] * 8.0 * rng.uniform(0.7, 1.3), 2),
        }
    elif segment_counts.get("sleeper", 0) > total_users * 0.25:
        churn_alert = {
            "severity": "medium",
            "title": "Rastući broj neaktivnih korisnika",
            "message": f"Segment 'Spavači' čini {round(segment_counts.get('sleeper', 0) / max(total_users, 1) * 100)}% ukupne publike. Razmislite o re-activation email kampanji.",
            "affectedCount": segment_counts.get("sleeper", 0),
            "estimatedRevenueAtRisk": round(segment_counts.get("sleeper", 0) * 0.5 * rng.uniform(0.7, 1.3), 2),
        }

    return {
        "fanSegments": fan_segments,
        "funnelSteps": funnel_steps,
        "clvData": clv_data,
        "churnPredictions": churn_predictions,
        "churnDistribution": churn_distribution,
        "growthTrend": growth_trend,
        "targeting": targeting,
        "monetaryValues": monetary_values,
        "aiAdvice": ai_advice,
        "churnAlert": churn_alert,
        "totalUsers": total_users,
        "_meta": {
            "is_estimate": True,
            "connected_platforms": connected_platforms,
            "analyzed_at": datetime.utcnow().isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# BFF Endpoint — returns ALL data for SegmentationPage
# ---------------------------------------------------------------------------


@router.get("/")
async def get_segmentation_page_data(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """BFF endpoint: returns full data for Segmentacija korisnika page."""
    user, client, role = ctx

    # Try to get real data from DB
    has_real_data = False
    fan_segments = []
    funnel_steps = []
    clv_data = []
    churn_predictions = []

    try:
        service = _get_service()
        result = await service.get_segments(db, client_id=client.id)
        if result and any(r.get("size", 0) > 0 for r in result):
            has_real_data = True
            stage_map = {
                "new": ("Novi", "UserPlus", "from-sky-600 to-sky-400"),
                "casual": ("Povremeni", "Users", "from-blue-600 to-blue-400"),
                "engaged": ("Aktivni", "Heart", "from-indigo-600 to-indigo-400"),
                "superfan": ("Superfan", "Star", "from-purple-600 to-purple-400"),
                "ambassador": ("Ambasador", "Award", "from-yellow-600 to-yellow-400"),
            }
            for seg in result:
                mapped = stage_map.get(
                    seg.get("name", "").lower(),
                    (seg.get("name", ""), "Users", "from-blue-600 to-blue-400"),
                )
                fan_segments.append({
                    "stage": mapped[0],
                    "count": seg.get("size", 0),
                    "icon_name": mapped[1],
                    "color": mapped[2],
                    "growth": seg.get("growth_trend", 0.0),
                    "description": "",
                })
            funnel_steps = [
                {"label": s["stage"], "value": s["count"], "color": "#3b82f6"}
                for s in fan_segments
            ]
    except Exception:
        logger.exception("Failed to fetch segments from DB")

    if not has_real_data:
        # Check social_handles for estimate generation
        connected_platforms: list[str] = []
        if client.social_handles and isinstance(client.social_handles, dict):
            for platform, url in client.social_handles.items():
                if url and isinstance(url, str) and url.strip():
                    connected_platforms.append(platform)

        if connected_platforms:
            # No real data — return empty structure instead of fake estimates
            return {
                "fanSegments": [],
                "funnelSteps": [],
                "clvData": [],
                "churnPredictions": [],
                "churnDistribution": [],
                "growthTrend": [],
                "targeting": [],
                "monetaryValues": [],
                "aiAdvice": None,
                "churnAlert": None,
                "totalUsers": 0,
                "_meta": {
                    "is_estimate": False,
                    "connected_platforms": connected_platforms,
                    "analyzed_at": datetime.utcnow().isoformat(),
                },
            }

    # Try CLV data
    try:
        service = _get_service()
        clv_result = await service.calculate_clv(db, client_id=client.id)
        if clv_result and any(r.get("count", 0) > 0 for r in clv_result):
            stage_names = {
                "new": "Novi", "casual": "Povremeni", "engaged": "Aktivni",
                "superfan": "Superfan", "ambassador": "Ambasador",
            }
            retention_map = {
                "new": "35%", "casual": "52%", "engaged": "78%",
                "superfan": "92%", "ambassador": "97%",
            }
            churn_risk_map = {
                "new": "Visoki", "casual": "Srednji", "engaged": "Niski",
                "superfan": "Vrlo nizak", "ambassador": "Minimalan",
            }
            clv_data = [
                {
                    "segment": stage_names.get(r["lifecycle_stage"], r["lifecycle_stage"]),
                    "clv": f"€{r.get('weighted_clv', 0):.2f}",
                    "retention": retention_map.get(r["lifecycle_stage"], "N/A"),
                    "churn_risk": churn_risk_map.get(r["lifecycle_stage"], "Srednji"),
                }
                for r in clv_result
            ]
    except Exception:
        logger.exception("Failed to calculate CLV from DB")

    # Try churn predictions
    try:
        service = _get_service()
        churn_result = await service.get_churn_predictions(db, client_id=client.id)
        if churn_result and any(r.get("fan_count", 0) > 0 for r in churn_result):
            churn_predictions = [
                {
                    "metric": f"Rizik: {r['risk_level']} ({r['days_inactive_threshold']}+ dana)",
                    "value": f"{r['fan_count']:,}",
                    "trend": "down" if r["risk_level"] in ("critical", "high") else "up",
                    "change": f"{r.get('fan_count', 0)}",
                    "description": f"CLV u riziku: €{r.get('avg_clv_at_risk', 0):.2f} • Ukupni prihod u riziku: €{r.get('estimated_revenue_at_risk', 0):,.2f}",
                }
                for r in churn_result
            ]
    except Exception:
        logger.exception("Failed to fetch churn predictions from DB")

    return {
        "fanSegments": fan_segments,
        "funnelSteps": funnel_steps,
        "clvData": clv_data,
        "churnPredictions": churn_predictions,
        "churnDistribution": [],
        "growthTrend": [],
        "targeting": [],
        "monetaryValues": [],
        "aiAdvice": None,
        "churnAlert": None,
        "totalUsers": sum(s["count"] for s in fan_segments),
        "_meta": {
            "is_estimate": False,
            "analyzed_at": datetime.utcnow().isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# Legacy endpoints (kept for backwards compat)
# ---------------------------------------------------------------------------


@router.get("/segments")
async def get_segments(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    try:
        service = _get_service()
        result = await service.get_segments(db, client_id=client.id)
        if result and any(r.get("size", 0) > 0 for r in result):
            stage_map = {
                "new": ("Novi", "UserPlus", "from-sky-600 to-sky-400"),
                "casual": ("Povremeni", "Users", "from-blue-600 to-blue-400"),
                "engaged": ("Aktivni", "Heart", "from-indigo-600 to-indigo-400"),
                "superfan": ("Superfan", "Star", "from-purple-600 to-purple-400"),
                "ambassador": ("Ambasador", "Award", "from-yellow-600 to-yellow-400"),
            }
            fan_segments = []
            for seg in result:
                mapped = stage_map.get(seg.get("name", "").lower(), (seg.get("name", ""), "Users", "from-blue-600 to-blue-400"))
                fan_segments.append({
                    "stage": mapped[0],
                    "count": seg.get("size", 0),
                    "icon_name": mapped[1],
                    "color": mapped[2],
                    "growth": seg.get("growth_trend", 0.0),
                    "description": "",
                })
            funnel_steps = [{"label": s["stage"], "value": s["count"], "color": "#3b82f6"} for s in fan_segments]
            return {"fan_segments": fan_segments, "funnel_steps": funnel_steps}
    except Exception:
        logger.exception("Failed to fetch segments from DB, returning empty data")
    return {"fan_segments": [], "funnel_steps": []}


@router.get("/profiles/{fan_id}")
async def get_fan_profile(
    fan_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_fan_profile(db, fan_id, client_id=client.id)
    return result


@router.post("/lifecycle/update")
async def update_lifecycle_stages(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.update_lifecycle_stages(db, client_id=client.id)
    return result


@router.get("/clv")
async def calculate_clv(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    try:
        service = _get_service()
        result = await service.calculate_clv(db, client_id=client.id)
        if result and any(r.get("count", 0) > 0 for r in result):
            stage_names = {
                "new": "Novi", "casual": "Povremeni", "engaged": "Aktivni",
                "superfan": "Superfan", "ambassador": "Ambasador",
            }
            retention_map = {
                "new": "35%", "casual": "52%", "engaged": "78%",
                "superfan": "92%", "ambassador": "97%",
            }
            churn_risk_map = {
                "new": "Visoki", "casual": "Srednji", "engaged": "Niski",
                "superfan": "Vrlo nizak", "ambassador": "Minimalan",
            }
            return [
                {
                    "segment": stage_names.get(r["lifecycle_stage"], r["lifecycle_stage"]),
                    "clv": f"€{r.get('weighted_clv', 0):.2f}",
                    "retention": retention_map.get(r["lifecycle_stage"], "N/A"),
                    "churn_risk": churn_risk_map.get(r["lifecycle_stage"], "Srednji"),
                }
                for r in result
            ]
    except Exception:
        logger.exception("Failed to calculate CLV from DB, returning empty data")
    return []


@router.get("/churn")
async def get_churn_predictions(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    try:
        service = _get_service()
        result = await service.get_churn_predictions(db, client_id=client.id)
        if result and any(r.get("fan_count", 0) > 0 for r in result):
            return [
                {
                    "metric": f"Rizik: {r['risk_level']} ({r['days_inactive_threshold']}+ dana)",
                    "value": f"{r['fan_count']:,}",
                    "trend": "down" if r["risk_level"] in ("critical", "high") else "up",
                    "change": f"{r.get('fan_count', 0)}",
                    "description": f"CLV u riziku: €{r.get('avg_clv_at_risk', 0):.2f} • Ukupni prihod u riziku: €{r.get('estimated_revenue_at_risk', 0):,.2f}",
                }
                for r in result
            ]
    except Exception:
        logger.exception("Failed to fetch churn predictions from DB, returning empty data")
    return []
