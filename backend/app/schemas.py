from typing import Literal

from pydantic import BaseModel, Field, field_validator


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=10, max_length=128)
    role: Literal["user", "admin"] = "user"

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric with optional '_' or '-'")
        return normalized


class UserLogin(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_login_username(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("Username must be at least 3 characters")
        return normalized


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AccessRequest(BaseModel):
    endpoint: str = "/access/resource"
    ip_address: str | None = None
    device_status: Literal["trusted", "untrusted"] = Field(
        default="trusted", description="trusted or untrusted"
    )
    access_time: str = Field(default="12:00", description="24h format HH:MM")

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, value: str) -> str:
        endpoint = value.strip()
        if not endpoint.startswith("/"):
            raise ValueError("Endpoint must start with '/'")
        return endpoint

    @field_validator("access_time")
    @classmethod
    def validate_access_time(cls, value: str) -> str:
        parts = value.split(":")
        if len(parts) != 2 or not all(part.isdigit() for part in parts):
            raise ValueError("access_time must be in HH:MM format")
        hour = int(parts[0])
        minute = int(parts[1])
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            raise ValueError("access_time must be in 24-hour HH:MM format")
        return f"{hour:02d}:{minute:02d}"


class AccessDecisionResponse(BaseModel):
    decision: Literal["ALLOW", "MFA_REQUIRED", "DENY"]
    risk_score: float
    reason: str
    message: str
    challenge_id: str | None = None
    challenge_expires_at: str | None = None
    debug_mfa_code: str | None = None


class MFAVerifyRequest(BaseModel):
    challenge_id: str
    code: str = Field(min_length=6, max_length=6)
    endpoint: str = "/access/resource"


class MFAVerifyResponse(BaseModel):
    decision: Literal["ALLOW", "DENY"]
    message: str
    reason: str
