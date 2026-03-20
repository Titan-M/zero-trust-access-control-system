import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import (
    ACCESS_RATE_LIMIT_PER_MINUTE,
    MFA_RATE_LIMIT_PER_MINUTE,
    MFA_CHALLENGE_TTL_SECONDS,
    MFA_DEBUG_MODE,
    MFA_MAX_ATTEMPTS,
    SECRET_KEY,
)
from ..database import get_db
from ..models import AuditLog, MFAChallenge, User
from ..policy import policy_decision
from ..rate_limit import allow_request
from ..risk_engine import calculate_risk_score
from ..schemas import (
    AccessDecisionResponse,
    AccessRequest,
    MFAVerifyRequest,
    MFAVerifyResponse,
)

router = APIRouter(prefix="/access", tags=["Access Control"])


def _hash_mfa_code(challenge_id: str, code: str) -> str:
    material = f"{challenge_id}:{code}:{SECRET_KEY}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def _create_audit_log(
    db: Session,
    username: str,
    endpoint: str,
    ip_address: str,
    device_status: str,
    access_time: str,
    risk_score: float,
    decision: str,
    reason: str,
):
    log = AuditLog(
        username=username,
        endpoint=endpoint,
        ip_address=ip_address,
        device_status=device_status,
        access_time=access_time,
        risk_score=risk_score,
        decision=decision,
        reason=reason,
    )
    db.add(log)


@router.post("/resource", response_model=AccessDecisionResponse)
def access_resource(
    payload: AccessRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = payload.ip_address or (request.client.host if request.client else "0.0.0.0")
    if not allow_request(f"access:{client_ip}", ACCESS_RATE_LIMIT_PER_MINUTE):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many access requests",
        )

    recent_denials = (
        db.query(AuditLog)
        .filter(
            AuditLog.username == current_user.username,
            AuditLog.decision == "DENY",
            AuditLog.created_at >= datetime.utcnow() - timedelta(hours=24),
        )
        .count()
    )

    score, reason = calculate_risk_score(
        role=current_user.role,
        ip_address=client_ip,
        device_status=payload.device_status,
        access_time=payload.access_time,
        endpoint=payload.endpoint,
        recent_denials=recent_denials,
    )
    decision, message = policy_decision(score)

    _create_audit_log(
        db=db,
        username=current_user.username,
        endpoint=payload.endpoint,
        ip_address=client_ip,
        device_status=payload.device_status,
        access_time=payload.access_time,
        risk_score=score,
        decision=decision,
        reason=reason,
    )

    challenge_id: str | None = None
    challenge_expires_at: str | None = None
    debug_code: str | None = None
    if decision == "MFA_REQUIRED":
        challenge_id = secrets.token_urlsafe(12)
        challenge_code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.utcnow() + timedelta(seconds=MFA_CHALLENGE_TTL_SECONDS)
        challenge = MFAChallenge(
            challenge_id=challenge_id,
            username=current_user.username,
            endpoint=payload.endpoint,
            risk_score=score,
            code_hash=_hash_mfa_code(challenge_id, challenge_code),
            expires_at=expires_at,
        )
        db.add(challenge)
        challenge_expires_at = expires_at.isoformat()
        if MFA_DEBUG_MODE:
            debug_code = challenge_code

    db.commit()

    return AccessDecisionResponse(
        decision=decision,
        risk_score=score,
        reason=reason,
        message=message,
        challenge_id=challenge_id,
        challenge_expires_at=challenge_expires_at,
        debug_mfa_code=debug_code,
    )


@router.post("/mfa/verify", response_model=MFAVerifyResponse)
def verify_mfa(
    payload: MFAVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "0.0.0.0"
    if not allow_request(f"mfa:{client_ip}", MFA_RATE_LIMIT_PER_MINUTE):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many MFA verification attempts",
        )

    challenge = (
        db.query(MFAChallenge)
        .filter(
            MFAChallenge.challenge_id == payload.challenge_id,
            MFAChallenge.username == current_user.username,
        )
        .first()
    )
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MFA challenge not found",
        )

    current_time = datetime.utcnow()

    if challenge.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Challenge is already {challenge.status.lower()}",
        )

    if challenge.expires_at < current_time:
        challenge.status = "EXPIRED"
        _create_audit_log(
            db=db,
            username=current_user.username,
            endpoint=payload.endpoint,
            ip_address=client_ip,
            device_status="unknown",
            access_time=current_time.strftime("%H:%M"),
            risk_score=challenge.risk_score,
            decision="DENY",
            reason="MFA challenge expired",
        )
        db.commit()
        return MFAVerifyResponse(
            decision="DENY",
            message="MFA challenge expired. Start a new access request.",
            reason="Challenge expired",
        )

    provided_hash = _hash_mfa_code(challenge.challenge_id, payload.code)
    if challenge.code_hash != provided_hash:
        challenge.attempts += 1
        if challenge.attempts >= MFA_MAX_ATTEMPTS:
            challenge.status = "FAILED"
        _create_audit_log(
            db=db,
            username=current_user.username,
            endpoint=payload.endpoint,
            ip_address=client_ip,
            device_status="unknown",
            access_time=current_time.strftime("%H:%M"),
            risk_score=challenge.risk_score,
            decision="DENY",
            reason=f"MFA verification failed (attempt {challenge.attempts})",
        )
        db.commit()
        return MFAVerifyResponse(
            decision="DENY",
            message="Invalid MFA code.",
            reason=(
                "Maximum attempts reached; request a new challenge."
                if challenge.attempts >= MFA_MAX_ATTEMPTS
                else "Try again with the correct code."
            ),
        )

    challenge.status = "VERIFIED"
    _create_audit_log(
        db=db,
        username=current_user.username,
        endpoint=payload.endpoint,
        ip_address=client_ip,
        device_status="unknown",
        access_time=current_time.strftime("%H:%M"),
        risk_score=challenge.risk_score,
        decision="ALLOW",
        reason="MFA challenge verified successfully",
    )
    db.commit()

    return MFAVerifyResponse(
        decision="ALLOW",
        message="MFA verification successful. Access granted.",
        reason="Additional verification passed",
    )

