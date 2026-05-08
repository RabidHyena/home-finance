import logging
from sqlalchemy.orm import Session
from app.models import AuditLog

logger = logging.getLogger(__name__)


def log_audit(
    db: Session,
    action: str,
    user_id: int | None = None,
    resource_type: str | None = None,
    resource_id: int | None = None,
    ip_address: str | None = None,
    details: str | None = None,
) -> None:
    """Write an audit log entry in the same transaction as the caller. Never raises.

    Uses a savepoint so a flush failure rolls back only the audit entry — the
    outer transaction remains usable and the caller can still commit its own work.
    """
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            details=details,
        )
        with db.begin_nested():
            db.add(entry)
            db.flush()
    except Exception:
        logger.exception("Failed to write audit log: action=%s user_id=%s", action, user_id)
