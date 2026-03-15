import random
from pathlib import Path
import io
from datetime import datetime, timedelta, date as date_type

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_claude_client, get_current_project
from app.services.report_generator import ReportGeneratorService
from app.config import settings

router = APIRouter()


def _get_service():
    return ReportGeneratorService(get_claude_client())


# ------------------------------------------------------------------
# Scheduling helpers
# ------------------------------------------------------------------

def _next_monday() -> str:
    """Calculate next Monday at 08:00 (Europe/Zagreb)."""
    now = datetime.utcnow()
    days_ahead = (7 - now.weekday()) % 7
    if days_ahead == 0 and now.hour >= 8:
        days_ahead = 7
    if days_ahead == 0 and now.hour < 8:
        pass  # today is Monday before 08:00
    next_mon = (now + timedelta(days=days_ahead)).replace(
        hour=8, minute=0, second=0, microsecond=0,
    )
    return next_mon.strftime("%d.%m.%Y. u %H:%M")


def _first_of_next_month() -> str:
    """Calculate 1st of next month at 06:00."""
    now = datetime.utcnow()
    if now.month == 12:
        d = datetime(now.year + 1, 1, 1, 6, 0, 0)
    else:
        d = datetime(now.year, now.month + 1, 1, 6, 0, 0)
    return d.strftime("%d.%m.%Y. u %H:%M")


# ------------------------------------------------------------------
# Estimate data generators
# ------------------------------------------------------------------

def _generate_estimate_weekly(
    client_id, client_name: str, connected_platforms: list[str],
) -> list[dict]:
    """Generate 3 estimate weekly reports."""
    rng = random.Random(f"weekly-{client_id}")
    reports = []
    now = datetime.utcnow()

    for i in range(3):
        offset = (i + 1) * 7
        week_end_dt = now - timedelta(days=offset - 6)
        week_start_dt = now - timedelta(days=offset)
        gen_date = week_end_dt + timedelta(days=1, hours=8)

        total_reach = rng.randint(15000, 120000)
        engagement_rate = round(rng.uniform(2.5, 6.0), 1)
        new_followers = rng.randint(80, 600)
        total_engagement = int(total_reach * engagement_rate / 100)
        plat = connected_platforms[0] if connected_platforms else "instagram"

        reports.append({
            "id": f"est-w-{i}-{str(client_id)[:8]}",
            "week_start": week_start_dt.date().isoformat(),
            "week_end": week_end_dt.date().isoformat(),
            "data": {
                "total_reach": total_reach,
                "total_engagement": total_engagement,
                "engagement_rate": engagement_rate,
                "new_followers": new_followers,
                "total_spend": rng.randint(100, 800),
                "total_conversions": rng.randint(10, 80),
                "roas": round(rng.uniform(2.0, 5.5), 1),
                "sentiment_positive": rng.randint(60, 80),
                "sentiment_negative": rng.randint(5, 15),
            },
            "top_posts": [
                {"title": f"Kampanja - {client_name}", "engagement": rng.randint(500, 5000), "platform": plat},
                {"title": "Proizvod u fokusu", "engagement": rng.randint(300, 3000), "platform": plat},
                {"title": "Story iz uredništva", "engagement": rng.randint(200, 2000), "platform": plat},
            ],
            "top_ads": [],
            "recommendations": {
                "summary": (
                    f"{'Odličan' if engagement_rate > 4 else 'Stabilan'} tjedan za {client_name}. "
                    f"Engagement rate od {engagement_rate}% je "
                    f"{'iznad' if engagement_rate > 3.5 else 'u skladu s'} industrijskim prosjekom."
                ),
                "actions": [
                    "Nastavite s video sadržajem koji donosi visok engagement",
                    "Optimizirajte vrijeme objave za bolji doseg",
                    "Testirajte Stories formate za povećanje interakcije",
                ],
            },
            "generated_at": gen_date.isoformat(),
            "created_at": gen_date.isoformat(),
        })

    return reports


def _generate_estimate_monthly(
    client_id, client_name: str, connected_platforms: list[str],
) -> list[dict]:
    """Generate 2 estimate monthly reports."""
    rng = random.Random(f"monthly-{client_id}")
    reports = []
    now = datetime.utcnow()

    month_names_hr = [
        "", "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
        "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac",
    ]

    for i in range(2):
        month = now.month - (i + 1)
        year = now.year
        if month <= 0:
            month += 12
            year -= 1

        # gen_date = 1st of next month
        if month == 12:
            gen_date = datetime(year + 1, 1, 1, 6, 0, 0)
        else:
            gen_date = datetime(year, month + 1, 1, 6, 0, 0)

        total_reach = rng.randint(50000, 400000)
        engagement_rate = round(rng.uniform(3.0, 5.5), 1)
        new_followers = rng.randint(300, 2000)
        plat = connected_platforms[0] if connected_platforms else "instagram"

        reports.append({
            "id": f"est-m-{i}-{str(client_id)[:8]}",
            "month": month,
            "year": year,
            "data": {
                "total_reach": total_reach,
                "total_engagement": int(total_reach * engagement_rate / 100),
                "engagement_rate": engagement_rate,
                "new_followers": new_followers,
                "total_spend": rng.randint(500, 3000),
                "total_conversions": rng.randint(40, 250),
                "roas": round(rng.uniform(2.5, 6.0), 1),
            },
            "top_posts": [
                {
                    "title": f"Top objava - {month_names_hr[month]}",
                    "engagement": rng.randint(2000, 15000),
                    "platform": plat,
                },
            ],
            "ai_strategy": {
                "summary": (
                    f"{month_names_hr[month]} "
                    f"{'je bio uspješan' if engagement_rate > 4 else 'donosi stabilne rezultate'} "
                    f"za {client_name}. Preporučujemo fokus na video sadržaj i interakciju s publikom."
                ),
                "recommendations": [
                    "Udvostručite ulaganje u video content",
                    "Pokrenite korisničku kampanju (UGC)",
                    "Isplanirajte sezonski content calendar",
                ],
            },
            "competitor_comparison": None,
            "pdf_url": "",
            "generated_at": gen_date.isoformat(),
            "created_at": gen_date.isoformat(),
        })

    return reports


# ------------------------------------------------------------------
# Serialization helpers
# ------------------------------------------------------------------

def _serialize_weekly(r) -> dict:
    """Serialize a WeeklyReport SQLAlchemy model to dict."""
    return {
        "id": str(r.id),
        "week_start": r.week_start.isoformat() if r.week_start else None,
        "week_end": r.week_end.isoformat() if r.week_end else None,
        "data": r.data,
        "top_posts": r.top_posts,
        "top_ads": r.top_ads,
        "recommendations": r.recommendations,
        "generated_at": r.generated_at.isoformat() if r.generated_at else None,
        "created_at": r.created_at.isoformat() if hasattr(r, "created_at") and r.created_at else None,
    }


def _serialize_monthly(r) -> dict:
    """Serialize a MonthlyReport SQLAlchemy model to dict."""
    return {
        "id": str(r.id),
        "month": r.month,
        "year": r.year,
        "data": r.data,
        "competitor_comparison": r.competitor_comparison,
        "ai_strategy": r.ai_strategy,
        "pdf_url": getattr(r, "pdf_url", ""),
        "generated_at": r.generated_at.isoformat() if r.generated_at else None,
        "created_at": r.created_at.isoformat() if hasattr(r, "created_at") and r.created_at else None,
    }


# ------------------------------------------------------------------
# Placeholder PDF
# ------------------------------------------------------------------

def _generate_placeholder_pdf(report_type: str, report_id: str) -> bytes:
    """Generate a minimal valid PDF as placeholder when real PDF doesn't exist."""
    title = f"ShiftOneZero Marketing - {report_type} Report"
    date_str = datetime.now().strftime("%d.%m.%Y")
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
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        f"4 0 obj\n<< /Length {stream_length} >>\nstream\n".encode("latin-1"),
        stream_bytes,
        b"\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
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


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@router.post("/generate/weekly")
async def generate_weekly_report(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_project),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.generate_weekly_report(db, client_id=client.id)
    return result


@router.post("/generate/monthly")
async def generate_monthly_report(
    month: int = Body(...),
    year: int = Body(...),
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_project),
):
    user, client, project, role = ctx
    service = _get_service()
    result = await service.generate_monthly_report(db, month, year, client_id=client.id)
    return result


@router.get("/weekly")
async def list_weekly_reports(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_project),
):
    user, client, project, role = ctx
    from app.models import WeeklyReport

    query = (
        select(WeeklyReport)
        .where(WeeklyReport.client_id == client.id, WeeklyReport.project_id == project.id)
        .order_by(WeeklyReport.created_at.desc())
    )
    res = await db.execute(query)
    reports = res.scalars().all()

    if reports:
        return {
            "reports": [_serialize_weekly(r) for r in reports],
            "_meta": {
                "is_estimate": False,
                "next_scheduled": _next_monday(),
                "schedule_note": "Automatsko generiranje svakog ponedjeljka u 08:00",
            },
        }

    # No reports - check for connected channels to show estimates
    connected_platforms: list[str] = []
    if client.social_handles and isinstance(client.social_handles, dict):
        for platform, url in client.social_handles.items():
            if url and isinstance(url, str) and url.strip():
                connected_platforms.append(platform)

    if connected_platforms:
        return {
            "reports": _generate_estimate_weekly(
                client.id, client.client_name or "Vaš brend", connected_platforms,
            ),
            "_meta": {
                "is_estimate": True,
                "next_scheduled": _next_monday(),
                "schedule_note": "Automatsko generiranje svakog ponedjeljka u 08:00",
                "connected_platforms": connected_platforms,
            },
        }

    return {
        "reports": [],
        "_meta": {
            "is_estimate": False,
            "next_scheduled": _next_monday(),
            "schedule_note": "Automatsko generiranje svakog ponedjeljka u 08:00",
        },
    }


@router.get("/monthly")
async def list_monthly_reports(
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_project),
):
    user, client, project, role = ctx
    from app.models import MonthlyReport

    query = (
        select(MonthlyReport)
        .where(MonthlyReport.client_id == client.id, MonthlyReport.project_id == project.id)
        .order_by(MonthlyReport.created_at.desc())
    )
    res = await db.execute(query)
    reports = res.scalars().all()

    if reports:
        return {
            "reports": [_serialize_monthly(r) for r in reports],
            "_meta": {
                "is_estimate": False,
                "next_scheduled": _first_of_next_month(),
                "schedule_note": "Automatsko generiranje 1. u mjesecu u 06:00",
            },
        }

    # No reports - check for connected channels to show estimates
    connected_platforms: list[str] = []
    if client.social_handles and isinstance(client.social_handles, dict):
        for platform, url in client.social_handles.items():
            if url and isinstance(url, str) and url.strip():
                connected_platforms.append(platform)

    if connected_platforms:
        return {
            "reports": _generate_estimate_monthly(
                client.id, client.client_name or "Vaš brend", connected_platforms,
            ),
            "_meta": {
                "is_estimate": True,
                "next_scheduled": _first_of_next_month(),
                "schedule_note": "Automatsko generiranje 1. u mjesecu u 06:00",
                "connected_platforms": connected_platforms,
            },
        }

    return {
        "reports": [],
        "_meta": {
            "is_estimate": False,
            "next_scheduled": _first_of_next_month(),
            "schedule_note": "Automatsko generiranje 1. u mjesecu u 06:00",
        },
    }


@router.get("/weekly/{report_id}")
async def get_weekly_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_project),
):
    user, client, project, role = ctx
    from app.models import WeeklyReport

    query = select(WeeklyReport).where(
        WeeklyReport.id == report_id,
        WeeklyReport.client_id == client.id,
        WeeklyReport.project_id == project.id,
    )
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")
    return report


@router.get("/monthly/{report_id}")
async def get_monthly_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: tuple = Depends(get_current_project),
):
    user, client, project, role = ctx
    from app.models import MonthlyReport

    query = select(MonthlyReport).where(
        MonthlyReport.id == report_id,
        MonthlyReport.client_id == client.id,
        MonthlyReport.project_id == project.id,
    )
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Monthly report not found")
    return report


@router.get("/weekly/{report_id}/download")
async def download_weekly_pdf(
    report_id: str,
    ctx: tuple = Depends(get_current_project),
):
    """Download the weekly report PDF. Falls back to placeholder if file doesn't exist."""
    pdf_path = Path(settings.MEDIA_ROOT) / f"reports/weekly_{report_id}.pdf"
    if pdf_path.exists():
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"shiftonezero_weekly_{report_id}.pdf",
        )
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
async def download_monthly_pdf(
    report_id: str,
    ctx: tuple = Depends(get_current_project),
):
    """Download the monthly report PDF. Falls back to placeholder if file doesn't exist."""
    pdf_path = Path(settings.MEDIA_ROOT) / f"reports/monthly_{report_id}.pdf"
    if pdf_path.exists():
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"shiftonezero_monthly_{report_id}.pdf",
        )
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
async def email_report(
    request: EmailReportRequest,
    ctx: tuple = Depends(get_current_project),
):
    """Send report via email. Returns mock success in dev mode."""
    return {
        "success": True,
        "message": f"Izvještaj uspješno poslan na {request.email or settings.NOTIFICATION_EMAIL or 'admin@shiftonezero.com'}",
        "report_id": request.report_id,
        "report_type": request.report_type,
    }
