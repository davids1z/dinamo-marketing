from pathlib import Path

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.dependencies import get_claude_client
from app.services.report_generator import ReportGeneratorService
from app.config import settings

router = APIRouter()


def _get_service():
    return ReportGeneratorService(get_claude_client())


@router.post("/generate/weekly")
async def generate_weekly_report(db: AsyncSession = Depends(get_db)):
    service = _get_service()
    result = await service.generate_weekly_report(db)
    return result


@router.post("/generate/monthly")
async def generate_monthly_report(
    month: int = Body(...),
    year: int = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = _get_service()
    result = await service.generate_monthly_report(db, month, year)
    return result


@router.get("/weekly")
async def list_weekly_reports(db: AsyncSession = Depends(get_db)):
    from app.models import WeeklyReport

    query = select(WeeklyReport).order_by(WeeklyReport.created_at.desc())
    res = await db.execute(query)
    reports = res.scalars().all()
    return reports


@router.get("/monthly")
async def list_monthly_reports(db: AsyncSession = Depends(get_db)):
    from app.models import MonthlyReport

    query = select(MonthlyReport).order_by(MonthlyReport.created_at.desc())
    res = await db.execute(query)
    reports = res.scalars().all()
    return reports


@router.get("/weekly/{report_id}")
async def get_weekly_report(report_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models import WeeklyReport

    query = select(WeeklyReport).where(WeeklyReport.id == report_id)
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")
    return report


@router.get("/monthly/{report_id}")
async def get_monthly_report(report_id: UUID, db: AsyncSession = Depends(get_db)):
    from app.models import MonthlyReport

    query = select(MonthlyReport).where(MonthlyReport.id == report_id)
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Monthly report not found")
    return report


@router.get("/weekly/{report_id}/download")
async def download_weekly_pdf(report_id: UUID):
    """Download the weekly report PDF."""
    pdf_path = Path(settings.MEDIA_ROOT) / f"reports/weekly_{report_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found. Generate the report first.")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"dinamo_weekly_{report_id}.pdf",
    )


@router.get("/monthly/{report_id}/download")
async def download_monthly_pdf(report_id: UUID):
    """Download the monthly report PDF."""
    pdf_path = Path(settings.MEDIA_ROOT) / f"reports/monthly_{report_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found. Generate the report first.")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"dinamo_monthly_{report_id}.pdf",
    )
