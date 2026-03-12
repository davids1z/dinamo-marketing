"""Celery configuration with beat schedule for all 11 recurring jobs."""

from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "shiftonezero",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.metrics_pull",
        "app.tasks.social_listening",
        "app.tasks.sentiment_analysis",
        "app.tasks.campaign_optimization",
        "app.tasks.content_publish",
        "app.tasks.creative_refresh",
        "app.tasks.cl_surge_check",
        "app.tasks.competitor_scan",
        "app.tasks.weekly_report",
        "app.tasks.monthly_cycle",
        "app.tasks.fan_lifecycle",
        "app.tasks.content_visual",
        "app.tasks.campaign_research",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Zagreb",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_retry_delay=60,
    task_max_retries=3,
)

# Beat schedule - 11 recurring jobs
celery_app.conf.beat_schedule = {
    # 1. Pull metrics from all platforms - every hour
    "metrics-pull-hourly": {
        "task": "tasks.pull_all_metrics",
        "schedule": crontab(minute=0),  # every hour at :00
    },
    # 2. Social listening scan - every 2 hours
    "social-listening-scan": {
        "task": "tasks.scan_brand_mentions",
        "schedule": crontab(minute=30, hour="*/2"),  # every 2h at :30
    },
    # 3. Sentiment analysis - every 4 hours
    "sentiment-analysis": {
        "task": "tasks.analyze_new_comments",
        "schedule": crontab(minute=0, hour="*/4"),  # every 4h
    },
    # 4. Campaign optimization - every 6 hours
    "campaign-optimization": {
        "task": "tasks.run_optimization_cycle",
        "schedule": crontab(minute=15, hour="*/6"),  # every 6h at :15
    },
    # 5. Content publish - every hour (scheduled posts)
    "content-publish-hourly": {
        "task": "tasks.publish_scheduled_content",
        "schedule": crontab(minute=5),  # every hour at :05
    },
    # 6. Creative refresh - daily at 02:00
    "creative-refresh-daily": {
        "task": "tasks.check_ad_fatigue",
        "schedule": crontab(minute=0, hour=2),
    },
    # 7. Champions League surge check - daily at 09:00
    "cl-surge-check-daily": {
        "task": "tasks.check_cl_schedule",
        "schedule": crontab(minute=0, hour=9),
    },
    # 8. Competitor scan - weekly Sunday 23:00
    "competitor-scan-weekly": {
        "task": "tasks.scan_all_competitors",
        "schedule": crontab(minute=0, hour=23, day_of_week=0),  # Sunday
    },
    # 9. Weekly report - Monday 08:00
    "weekly-report": {
        "task": "tasks.generate_weekly_report",
        "schedule": crontab(minute=0, hour=8, day_of_week=1),  # Monday
    },
    # 10. Monthly cycle - 1st of month at 06:00
    "monthly-cycle": {
        "task": "tasks.run_monthly_cycle",
        "schedule": crontab(minute=0, hour=6, day_of_month=1),
    },
    # 11. Fan lifecycle update - daily at 04:00
    "fan-lifecycle-daily": {
        "task": "tasks.update_fan_lifecycles",
        "schedule": crontab(minute=0, hour=4),
    },
}
