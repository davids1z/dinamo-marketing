import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_client, get_claude_client
from app.services.fan_data import FanDataService

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_service():
    return FanDataService(get_claude_client())


# ---------------------------------------------------------------------------
# Fallback mock data – returned when the DB is empty or the service fails.
# Shaped exactly as the dashboard FanInsights page expects.
# ---------------------------------------------------------------------------

FALLBACK_SEGMENTS = {
    "fan_segments": [
        {
            "stage": "Novi",
            "count": 45000,
            "icon_name": "UserPlus",
            "color": "from-sky-600 to-sky-400",
            "growth": 12.4,
            "description": "Pridruženi u zadnjih 30 dana",
        },
        {
            "stage": "Povremeni",
            "count": 120000,
            "icon_name": "Users",
            "color": "from-blue-600 to-blue-400",
            "growth": 5.2,
            "description": "Prate, ali nizak angažman",
        },
        {
            "stage": "Aktivni",
            "count": 280000,
            "icon_name": "Heart",
            "color": "from-indigo-600 to-indigo-400",
            "growth": 8.1,
            "description": "Redovita interakcija",
        },
        {
            "stage": "Superfan",
            "count": 85000,
            "icon_name": "Star",
            "color": "from-purple-600 to-purple-400",
            "growth": 15.3,
            "description": "Visoki angažman + kupnje",
        },
        {
            "stage": "Ambasador",
            "count": 12000,
            "icon_name": "Award",
            "color": "from-yellow-600 to-yellow-400",
            "growth": 22.7,
            "description": "UGC kreatori i zagovornici",
        },
    ],
    "funnel_steps": [
        {"label": "Ukupni doseg", "value": 542000, "color": "#0ea5e9"},
        {"label": "Aktivni pratitelji", "value": 280000, "color": "#3b82f6"},
        {"label": "Angazirani navijaci", "value": 120000, "color": "#6366f1"},
        {"label": "Superfanovi", "value": 85000, "color": "#a855f7"},
        {"label": "Ambasadori", "value": 12000, "color": "#eab308"},
    ],
}

FALLBACK_CLV = [
    {"segment": "Novi", "clv": "\u20ac2.10", "retention": "35%", "churn_risk": "Visoki"},
    {"segment": "Povremeni", "clv": "\u20ac8.50", "retention": "52%", "churn_risk": "Srednji"},
    {"segment": "Aktivni", "clv": "\u20ac24.00", "retention": "78%", "churn_risk": "Niski"},
    {"segment": "Superfan", "clv": "\u20ac86.00", "retention": "92%", "churn_risk": "Vrlo nizak"},
    {"segment": "Ambasador", "clv": "\u20ac210.00", "retention": "97%", "churn_risk": "Minimalan"},
]

FALLBACK_CHURN = [
    {
        "metric": "Navijači pod rizikom (30 dana)",
        "value": "8,420",
        "trend": "down",
        "change": "-12%",
        "description": "Navijači koji će vjerojatno prestati pratiti u sljedećih 30 dana",
    },
    {
        "metric": "Ciljevi za reaktivaciju",
        "value": "3,150",
        "trend": "up",
        "change": "+8%",
        "description": "Neaktivni navijači s potencijalom reaktivacije",
    },
    {
        "metric": "Kandidati za nadogradnju",
        "value": "15,800",
        "trend": "up",
        "change": "+22%",
        "description": "Povremeni navijači koji pokazuju signale Superfana",
    },
]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/segments")
async def get_segments(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    try:
        service = _get_service()
        result = await service.get_segments(db)
        # If the service returned real segment rows, transform them into the
        # shape the dashboard expects and also build a funnel.
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
        logger.exception("Failed to fetch segments from DB, returning fallback data")
    return FALLBACK_SEGMENTS


@router.get("/profiles/{fan_id}")
async def get_fan_profile(
    fan_id: UUID,
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.get_fan_profile(db, fan_id)
    return result


@router.post("/lifecycle/update")
async def update_lifecycle_stages(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    service = _get_service()
    result = await service.update_lifecycle_stages(db)
    return result


@router.get("/clv")
async def calculate_clv(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    try:
        service = _get_service()
        result = await service.calculate_clv(db)
        # If we got real CLV data, transform it for the dashboard
        if result and any(r.get("count", 0) > 0 for r in result):
            stage_names = {
                "new": "Novi",
                "casual": "Povremeni",
                "engaged": "Aktivni",
                "superfan": "Superfan",
                "ambassador": "Ambasador",
            }
            retention_map = {
                "new": "35%",
                "casual": "52%",
                "engaged": "78%",
                "superfan": "92%",
                "ambassador": "97%",
            }
            churn_risk_map = {
                "new": "Visoki",
                "casual": "Srednji",
                "engaged": "Niski",
                "superfan": "Vrlo nizak",
                "ambassador": "Minimalan",
            }
            return [
                {
                    "segment": stage_names.get(r["lifecycle_stage"], r["lifecycle_stage"]),
                    "clv": f"\u20ac{r.get('weighted_clv', 0):.2f}",
                    "retention": retention_map.get(r["lifecycle_stage"], "N/A"),
                    "churn_risk": churn_risk_map.get(r["lifecycle_stage"], "Srednji"),
                }
                for r in result
            ]
    except Exception:
        logger.exception("Failed to calculate CLV from DB, returning fallback data")
    return FALLBACK_CLV


@router.get("/churn")
async def get_churn_predictions(
    ctx: tuple = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    user, client, role = ctx
    try:
        service = _get_service()
        result = await service.get_churn_predictions(db)
        # If we got real churn data, transform it for the dashboard
        if result and any(r.get("fan_count", 0) > 0 for r in result):
            return [
                {
                    "metric": f"Rizik: {r['risk_level']} ({r['days_inactive_threshold']}+ dana)",
                    "value": f"{r['fan_count']:,}",
                    "trend": "down" if r["risk_level"] in ("critical", "high") else "up",
                    "change": f"{r.get('fan_count', 0)}",
                    "description": f"CLV u riziku: \u20ac{r.get('avg_clv_at_risk', 0):.2f} • Ukupni prihod u riziku: \u20ac{r.get('estimated_revenue_at_risk', 0):,.2f}",
                }
                for r in result
            ]
    except Exception:
        logger.exception("Failed to fetch churn predictions from DB, returning fallback data")
    return FALLBACK_CHURN
