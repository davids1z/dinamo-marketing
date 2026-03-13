"""Audit logging helper — records admin/user actions for traceability."""

import uuid
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncSession,
    user: User,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Create an AuditLog entry. Does NOT commit — caller manages the transaction.

    Actions follow the pattern: "entity.verb", e.g.:
    - user.login, user.create, user.update, user.deactivate, user.impersonate
    - membership.role_change, membership.remove
    - client.update, client.subscription_change
    """
    entry = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    logger.debug("Audit: %s by %s on %s/%s", action, user.email, entity_type, entity_id)
