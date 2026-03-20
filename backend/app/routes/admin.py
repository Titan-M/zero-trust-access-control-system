from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import AuditLog, User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    bounded_limit = min(max(limit, 1), 500)
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(bounded_limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "username": log.username,
            "endpoint": log.endpoint,
            "ip_address": log.ip_address,
            "device_status": log.device_status,
            "access_time": log.access_time,
            "risk_score": log.risk_score,
            "decision": log.decision,
            "reason": log.reason,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

