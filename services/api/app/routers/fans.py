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
        result = await service.get_segments(db, client_id=client.id)
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
        # If we got real churn data, transform it for the dashboard
        if result and any(r.get("fan_count", 0) > 0 for r in result):
            return [
                {
                    "metric": f"Rizik: {r['risk_level']} ({r['days_inactive_threshold']}+ dana)",
                    "value": f"{r['fan_count']:,}",
                    "trend": "down" if r["risk_level"] in ("critical", "high") else "up",
                    "change": f"{r.get('fan_count', 0)}",
                    "description": f"CLV u riziku: \u20ac{r.get('avg_clv_at_risk', 0):.2f} \u2022 Ukupni prihod u riziku: \u20ac{r.get('estimated_revenue_at_risk', 0):,.2f}",
                }
                for r in result
            ]
    except Exception:
        logger.exception("Failed to fetch churn predictions from DB, returning empty data")
    return []
