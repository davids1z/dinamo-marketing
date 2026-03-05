from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client
from app.services.fan_data import FanDataService

router = APIRouter()


def _get_service():
    return FanDataService(get_claude_client())


@router.get("/segments")
async def get_segments(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_segments(db)
    return result


@router.get("/profiles/{fan_id}")
async def get_fan_profile(fan_id: UUID, db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_fan_profile(db, fan_id)
    return result


@router.post("/lifecycle/update")
async def update_lifecycle_stages(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.update_lifecycle_stages(db)
    return result


@router.get("/clv")
async def calculate_clv(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.calculate_clv(db)
    return result


@router.get("/churn")
async def get_churn_predictions(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.get_churn_predictions(db)
    return result
