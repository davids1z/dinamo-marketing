"""Notification creation and email delivery service."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def create_notification_sync(type: str, title: str, body: str, severity: str = "info", link: str = ""):
    """Create a notification from a Celery task (sync context)."""
    from app.database import SyncSessionLocal
    from app.models.notification import Notification

    try:
        with SyncSessionLocal() as db:
            notif = Notification(
                type=type,
                title=title,
                body=body,
                severity=severity,
                link=link,
            )
            db.add(notif)
            db.commit()

            # Send email if SMTP configured
            if settings.SMTP_HOST and settings.NOTIFICATION_EMAIL:
                try:
                    _send_email(title, body)
                    notif.email_sent = True
                    db.commit()
                except Exception as e:
                    logger.warning("Failed to send notification email: %s", e)

            logger.info("Created notification: [%s] %s", type, title)
    except Exception as exc:
        logger.error("Failed to create notification: %s", exc)


def _send_email(subject: str, body: str):
    """Send notification email via SMTP."""
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER or "noreply@dinamo-marketing.hr"
    msg["To"] = settings.NOTIFICATION_EMAIL
    msg["Subject"] = f"[Dinamo Marketing] {subject}"

    html = f"""
    <html><body style="font-family: Arial, sans-serif; color: #333;">
    <div style="border-top: 4px solid #0057A8; padding: 20px;">
        <h2 style="color: #0A1A28;">{subject}</h2>
        <p>{body}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Dinamo Marketing Platform</p>
    </div>
    </body></html>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
    logger.info("Notification email sent: %s", subject)
