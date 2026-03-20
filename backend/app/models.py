from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    endpoint = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    device_status = Column(String, nullable=False)
    access_time = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)
    decision = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MFAChallenge(Base):
    __tablename__ = "mfa_challenges"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, index=True, nullable=False)
    endpoint = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)
    code_hash = Column(String, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
