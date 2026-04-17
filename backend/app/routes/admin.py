from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import AuditLog, User
from ..risk_engine import get_weights, update_weights

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


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "hashed_password": user.hashed_password,
        }
        for user in users
    ]


@router.get("/settings/weights")
def get_algorithm_weights(current_admin: User = Depends(get_current_admin)):
    return get_weights()


@router.post("/settings/weights")
def save_algorithm_weights(
    weights: dict = Body(...),
    current_admin: User = Depends(get_current_admin)
):
    update_weights(weights)
    return {"message": "Weights updated successfully", "weights": get_weights()}

