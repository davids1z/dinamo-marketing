from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.dependencies import get_claude_client
from app.services.sentiment_analyzer import SentimentAnalyzerService

router = APIRouter()


def _get_service():
    return SentimentAnalyzerService(get_claude_client())


@router.post("/analyze")
async def analyze_comments(
    comments: List[str] = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.analyze_comments(db, comments)
    return result


@router.get("/overview")
async def get_sentiment_overview(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.get_sentiment_overview(db, days)
    return result


@router.get("/topics")
async def get_top_topics(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.get_top_topics(db, days)
    return result


@router.get("/timeline")
async def get_sentiment_timeline(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.get_sentiment_timeline(db, days)
    return result
