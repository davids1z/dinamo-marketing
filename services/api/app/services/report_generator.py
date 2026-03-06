"""Modul 16: Report Generator service."""

import logging
import os
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import MonthlyReport, WeeklyReport
from app.services.pdf_generator import generate_weekly_pdf, generate_monthly_pdf

logger = logging.getLogger(__name__)


def _save_pdf(pdf_bytes: bytes, rel_path: str) -> str:
    """Save PDF bytes to media directory, return relative URL."""
    from app.config import settings
    media_root = Path(settings.MEDIA_ROOT)
    full_path = media_root / rel_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_bytes(pdf_bytes)
    logger.info("Saved PDF: %s (%d bytes)", full_path, len(pdf_bytes))
    return f"/media/{rel_path}"


class ReportGeneratorService:
    def __init__(self, claude_client):
        self.claude_client = claude_client

    async def generate_weekly_report(self, db: AsyncSession) -> dict:
        """Generate weekly summary report."""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        # Aggregate data (in real implementation, pull from post_metrics, ad_metrics, etc.)
        report_data = {
            "period": f"{week_start} to {week_end}",
            "total_reach": 850_000,
            "total_engagement": 42_500,
            "avg_engagement_rate": 3.1,
            "total_ad_spend": 2_800,
            "total_conversions": 145,
            "avg_roas": 3.4,
            "sentiment": {"positive": 68, "neutral": 22, "negative": 10},
            "new_followers": 2_350,
        }

        # Generate AI recommendations
        recommendations = await self.claude_client.generate_report_summary(report_data)

        top_posts = [
            {"id": "1", "platform": "instagram", "type": "reel", "engagement": 12500, "reach": 95000},
            {"id": "2", "platform": "tiktok", "type": "video", "engagement": 8900, "reach": 78000},
            {"id": "3", "platform": "instagram", "type": "carousel", "engagement": 7200, "reach": 62000},
        ]

        top_ads = [
            {"id": "1", "campaign": "CL Awareness DE", "ctr": 4.2, "roas": 5.1, "spend": 450},
            {"id": "2", "campaign": "Matchday HR", "ctr": 3.8, "roas": 4.3, "spend": 320},
        ]

        report = WeeklyReport(
            week_start=week_start,
            week_end=week_end,
            data=report_data,
            top_posts=top_posts,
            top_ads=top_ads,
            recommendations={"text": recommendations, "items": [
                "Increase TikTok posting frequency - completion rates are 15% above average",
                "Scale German diaspora campaign - ROAS 5.1x on awareness ads",
                "Create more academy content - highest engagement rate of all pillars this week",
            ]},
        )
        db.add(report)
        await db.flush()

        # Generate PDF
        try:
            full_data = {
                "period": {"start": str(week_start), "end": str(week_end), "days": 7},
                "organic_performance": {
                    "total_posts": 8, "total_impressions": report_data.get("total_reach", 0),
                    "avg_engagement_rate": report_data.get("avg_engagement_rate", 0),
                    "total_likes": report_data.get("total_engagement", 0),
                    "total_comments": 0, "total_shares": 0,
                    "top_posts": [{"title": p.get("platform", ""), "platform": p.get("platform", ""),
                                   "engagement_rate": p.get("engagement", 0) / max(p.get("reach", 1), 1) * 100,
                                   "impressions": p.get("reach", 0)} for p in top_posts],
                },
                "paid_performance": {
                    "total_ads": 2, "total_spend": report_data.get("total_ad_spend", 0),
                    "total_impressions": 0, "total_conversions": report_data.get("total_conversions", 0),
                    "weighted_roas": report_data.get("avg_roas", 0),
                    "avg_ctr": 0, "avg_cpc": 0,
                    "top_ads": [{"campaign": a.get("campaign", ""), "platform": a.get("platform", ""),
                                 "roas": a.get("roas", 0), "spend": a.get("spend", 0),
                                 "conversions": 0} for a in top_ads],
                },
                "sentiment_overview": report_data.get("sentiment", {}),
                "ai_recommendations": report.recommendations.get("items", []) if isinstance(report.recommendations, dict) else [],
            }
            pdf_bytes = generate_weekly_pdf(full_data)
            pdf_url = _save_pdf(pdf_bytes, f"reports/weekly_{report.id}.pdf")
        except Exception as exc:
            logger.warning("PDF generation failed for weekly report: %s", exc)
            pdf_url = ""

        logger.info(f"Generated weekly report for {week_start} to {week_end}")
        return {
            "id": str(report.id),
            "week_start": str(week_start),
            "week_end": str(week_end),
            "data": report_data,
            "recommendations": report.recommendations,
            "pdf_url": pdf_url,
        }

    async def generate_monthly_report(self, db: AsyncSession, month: int, year: int) -> dict:
        """Generate comprehensive monthly report."""
        report_data = {
            "month": month,
            "year": year,
            "platforms": {
                "instagram": {"followers": 567000, "reach": 3_200_000, "engagement_rate": 2.8},
                "facebook": {"followers": 320000, "reach": 1_100_000, "engagement_rate": 1.5},
                "tiktok": {"followers": 89000, "views": 2_100_000, "completion_rate": 45},
                "youtube": {"subscribers": 145000, "views": 750_000, "watch_time_hours": 12500},
            },
            "campaigns": {
                "total": 8,
                "active": 5,
                "total_spend": 12_450,
                "total_conversions": 580,
                "avg_roas": 3.2,
            },
            "content": {
                "posts_published": 124,
                "avg_engagement_rate": 2.9,
                "best_pillar": "match_highlights",
                "worst_pillar": "lifestyle",
            },
            "sentiment": {"positive": 65, "neutral": 25, "negative": 10},
            "markets": {
                "HR": {"spend": 3200, "roas": 4.1, "new_followers": 1200},
                "DE": {"spend": 2800, "roas": 3.8, "new_followers": 890},
                "AT": {"spend": 1500, "roas": 4.5, "new_followers": 650},
                "BA": {"spend": 1200, "roas": 3.2, "new_followers": 520},
                "CH": {"spend": 800, "roas": 2.9, "new_followers": 310},
            },
        }

        # AI strategy recommendation
        ai_strategy = await self.claude_client.generate_strategy_recommendation(report_data)

        report = MonthlyReport(
            month=month,
            year=year,
            data=report_data,
            competitor_comparison={
                "dinamo_growth": 2.3,
                "hajduk_growth": 1.8,
                "salzburg_growth": 3.1,
            },
            ai_strategy=ai_strategy,
            pdf_url="",
        )
        db.add(report)
        await db.flush()

        # Generate PDF
        try:
            pdf_data = {
                "period": {"month": month, "year": year},
                "executive_summary": {
                    "headline": f"Monthly report for {month}/{year}",
                    "total_reach": report_data.get("platforms", {}).get("instagram", {}).get("reach", 0),
                    "total_engagement": 0,
                    "total_spend": report_data.get("campaigns", {}).get("total_spend", 0),
                    "total_revenue": 0,
                    "profit": 0,
                },
                "organic": {
                    "total_posts": report_data.get("content", {}).get("posts_published", 0),
                    "total_impressions": 0, "total_reach": 0,
                    "avg_engagement_rate": report_data.get("content", {}).get("avg_engagement_rate", 0),
                },
                "paid": {
                    "total_campaigns": report_data.get("campaigns", {}).get("total", 0),
                    "total_spend": report_data.get("campaigns", {}).get("total_spend", 0),
                    "total_conversions": report_data.get("campaigns", {}).get("total_conversions", 0),
                    "weighted_roas": report_data.get("campaigns", {}).get("avg_roas", 0),
                    "avg_ctr": 0,
                },
                "sentiment": report_data.get("sentiment", {}),
                "market_position": {},
            }
            pdf_bytes = generate_monthly_pdf(pdf_data)
            pdf_url = _save_pdf(pdf_bytes, f"reports/monthly_{report.id}.pdf")
            report.pdf_url = pdf_url
            await db.flush()
        except Exception as exc:
            logger.warning("PDF generation failed for monthly report: %s", exc)
            pdf_url = ""

        logger.info(f"Generated monthly report for {month}/{year}")
        return {
            "id": str(report.id),
            "month": month,
            "year": year,
            "data": report_data,
            "ai_strategy": ai_strategy,
            "pdf_url": pdf_url,
        }
