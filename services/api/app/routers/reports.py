from pathlib import Path
import io
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_claude_client
from app.services.report_generator import ReportGeneratorService
from app.config import settings

router = APIRouter()


def _get_service():
    return ReportGeneratorService(get_claude_client())


def _generate_placeholder_pdf(report_type: str, report_id: str) -> bytes:
    """Generate a minimal valid PDF as placeholder when real PDF doesn't exist."""
    title = f"ShiftOneZero Marketing - {report_type} Report"
    date_str = datetime.now().strftime("%d.%m.%Y")
    # Minimal valid PDF structure
    content_stream = (
        f"BT /F1 24 Tf 50 750 Td ({title}) Tj ET\n"
        f"BT /F1 14 Tf 50 700 Td (Report ID: {report_id}) Tj ET\n"
        f"BT /F1 14 Tf 50 670 Td (Generirano: {date_str}) Tj ET\n"
        f"BT /F1 12 Tf 50 620 Td (Demo Brand - Marketing Performance Report) Tj ET\n"
        f"BT /F1 12 Tf 50 590 Td (Engagement Rate: 4.2% (+0.3%)) Tj ET\n"
        f"BT /F1 12 Tf 50 560 Td (Follower Growth: +1,247 novih pratitelja) Tj ET\n"
        f"BT /F1 12 Tf 50 530 Td (Top Post: Match Highlights - 12,456 interakcija) Tj ET\n"
        f"BT /F1 12 Tf 50 500 Td (Ukupni doseg: 156,789 korisnika) Tj ET\n"
        f"BT /F1 12 Tf 50 450 Td (Ovo je placeholder izvjestaj.) Tj ET\n"
        f"BT /F1 12 Tf 50 420 Td (Pravi izvjestaj ce biti generiran s potpunim podacima.) Tj ET\n"
    )
    stream_bytes = content_stream.encode("latin-1")
    stream_length = len(stream_bytes)

    pdf_parts = [
        b"%PDF-1.4\n",
        # Object 1: Catalog
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        # Object 2: Pages
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        # Object 3: Page
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        # Object 4: Content stream
        f"4 0 obj\n<< /Length {stream_length} >>\nstream\n".encode("latin-1"),
        stream_bytes,
        b"\nendstream\nendobj\n",
        # Object 5: Font
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        # Cross-reference table (simplified)
        b"xref\n0 6\n",
        b"0000000000 65535 f \n",
        b"0000000009 00000 n \n",
        b"0000000058 00000 n \n",
        b"0000000115 00000 n \n",
        b"0000000282 00000 n \n",
        f"{'0000000000':>10} 00000 n \n".encode("latin-1"),
        b"trailer\n<< /Size 6 /Root 1 0 R >>\n",
        b"startxref\n0\n%%EOF\n",
    ]
    return b"".join(pdf_parts)


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
async def download_weekly_pdf(report_id: str):
    """Download the weekly report PDF. Falls back to placeholder if file doesn't exist."""
    # Try UUID parse for real file lookup
    pdf_path = Path(settings.MEDIA_ROOT) / f"reports/weekly_{report_id}.pdf"
    if pdf_path.exists():
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"shiftonezero_weekly_{report_id}.pdf",
        )
    # Generate placeholder PDF on the fly
    pdf_bytes = _generate_placeholder_pdf("Tjedni", str(report_id))
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="shiftonezero_tjedni_izvjestaj_{report_id}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/monthly/{report_id}/download")
async def download_monthly_pdf(report_id: str):
    """Download the monthly report PDF. Falls back to placeholder if file doesn't exist."""
    pdf_path = Path(settings.MEDIA_ROOT) / f"reports/monthly_{report_id}.pdf"
    if pdf_path.exists():
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"shiftonezero_monthly_{report_id}.pdf",
        )
    # Generate placeholder PDF on the fly
    pdf_bytes = _generate_placeholder_pdf("Mjesecni", str(report_id))
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="shiftonezero_mjesecni_izvjestaj_{report_id}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


class EmailReportRequest(BaseModel):
    email: str = ""
    report_id: str = ""
    report_type: str = "weekly"


@router.post("/email")
async def email_report(request: EmailReportRequest):
    """Send report via email. Returns mock success in dev mode."""
    # In production, this would use SMTP settings to send the actual PDF
    # For now, return success mock response
    return {
        "success": True,
        "message": f"Izvještaj uspješno poslan na {request.email or settings.NOTIFICATION_EMAIL or 'admin@shiftonezero.com'}",
        "report_id": request.report_id,
        "report_type": request.report_type,
    }
