"""AI Insights router — generate contextual AI insights for any dashboard page."""

import asyncio
import logging
import uuid as uuid_mod
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.dependencies import get_current_client
from app.integrations.openrouter_insights import (
    compute_data_hash,
    generate_insights,
    PROMPT_BUILDERS,
)
from app.services.cache import cache_get, cache_set

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for async insight generation tasks
_insight_tasks: dict[str, dict] = {}

CACHE_TTL = 3600  # 1 hour


class InsightRequest(BaseModel):
    page_key: str
    page_data: dict = {}


async def _run_insight_generation(task_id: str, api_key: str, page_key: str, page_data: dict, cache_key: str):
    """Background coroutine for AI insight generation."""
    try:
        result = await generate_insights(api_key, page_key, page_data)
        result["generated_at"] = datetime.now().isoformat()
        result["page_key"] = page_key

        # Only cache if insights were actually generated (not fallback)
        if result.get("insights") and len(result["insights"]) > 0:
            await cache_set(cache_key, result, CACHE_TTL)

        _insight_tasks[task_id] = {
            "status": "done",
            "insights": result,
        }
    except Exception as e:
        logger.error("AI insight generation failed for %s: %s", page_key, e)
        _insight_tasks[task_id] = {
            "status": "error",
            "error": str(e),
        }


@router.post("/generate")
async def generate_page_insights(
    request: InsightRequest,
    ctx: tuple = Depends(get_current_client),
):
    """Generate AI insights for a dashboard page. Returns cached or starts async task."""
    user, client, role = ctx
    if request.page_key not in PROMPT_BUILDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Nepoznata stranica: {request.page_key}. Dozvoljene: {list(PROMPT_BUILDERS.keys())}",
        )

    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY nije konfiguriran",
        )

    # Check cache (scoped to client)
    data_hash = compute_data_hash(request.page_key, request.page_data)
    cache_key = f"ai-insights:{client.id}:{request.page_key}:{data_hash}"

    cached = await cache_get(cache_key)
    if cached:
        return {"status": "done", "insights": cached, "cached": True}

    # Start async task
    task_id = str(uuid_mod.uuid4())
    _insight_tasks[task_id] = {"status": "running", "page_key": request.page_key}

    asyncio.create_task(
        _run_insight_generation(task_id, api_key, request.page_key, request.page_data, cache_key)
    )

    return {"status": "running", "task_id": task_id}


@router.get("/task/{task_id}")
async def get_insight_task(
    task_id: str,
    ctx: tuple = Depends(get_current_client),
):
    """Poll for AI insight generation result."""
    task = _insight_tasks.get(task_id)
    if not task:
        return {"status": "not_found", "error": "Zadatak nije pronađen"}

    # Clean up completed tasks after returning
    if task["status"] in ("done", "error"):
        result = dict(task)
        _insight_tasks.pop(task_id, None)
        return result

    return task
