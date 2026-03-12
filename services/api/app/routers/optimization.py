from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_project, get_claude_client, get_meta_client
from app.services.optimization_engine import OptimizationEngineService

router = APIRouter()


def _get_service():
    return OptimizationEngineService(
        get_claude_client(),
        get_meta_client(),
    )


@router.post("/run")
async def run_optimization_cycle(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.run_optimization_cycle(db)
    return result


@router.get("/logs")
async def get_optimization_logs(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import OptimizationLog

    query = select(OptimizationLog).where(OptimizationLog.client_id == client.id).order_by(OptimizationLog.created_at.desc())
    res = await db.execute(query)
    logs = res.scalars().all()
    return logs


@router.get("/rules")
async def get_optimization_rules(
    ctx: tuple = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    user, client, project, role = ctx
    from app.models import OptimizationRule

    query = select(OptimizationRule).where(OptimizationRule.client_id == client.id, OptimizationRule.project_id == project.id).order_by(OptimizationRule.created_at.desc())
    res = await db.execute(query)
    rules = res.scalars().all()
    return rules
