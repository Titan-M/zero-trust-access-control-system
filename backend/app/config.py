import os


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


ENVIRONMENT = os.getenv("ZTAC_ENV", "development").strip().lower()
IS_PRODUCTION = ENVIRONMENT == "production"

DATABASE_URL = os.getenv("ZTAC_DATABASE_URL", "sqlite:///:memory:")
SECRET_KEY = os.getenv("ZTAC_SECRET_KEY", "dev-only-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = _as_int(
    os.getenv("ZTAC_ACCESS_TOKEN_EXPIRE_MINUTES"), default=60
)
MFA_CHALLENGE_TTL_SECONDS = _as_int(
    os.getenv("ZTAC_MFA_CHALLENGE_TTL_SECONDS"), default=300
)
MFA_MAX_ATTEMPTS = _as_int(os.getenv("ZTAC_MFA_MAX_ATTEMPTS"), default=3)
MFA_DEBUG_MODE = _as_bool(os.getenv("ZTAC_MFA_DEBUG_MODE"), default=not IS_PRODUCTION)

LOG_LEVEL = os.getenv("ZTAC_LOG_LEVEL", "INFO").upper()
ENABLE_HTTPS_REDIRECT = _as_bool(
    os.getenv("ZTAC_ENABLE_HTTPS_REDIRECT"), default=IS_PRODUCTION
)

TRUSTED_HOSTS_RAW = os.getenv("ZTAC_TRUSTED_HOSTS", "localhost,127.0.0.1")
TRUSTED_HOSTS = [host.strip() for host in TRUSTED_HOSTS_RAW.split(",") if host.strip()]

AUTH_RATE_LIMIT_PER_MINUTE = _as_int(
    os.getenv("ZTAC_AUTH_RATE_LIMIT_PER_MINUTE"), default=20
)
ACCESS_RATE_LIMIT_PER_MINUTE = _as_int(
    os.getenv("ZTAC_ACCESS_RATE_LIMIT_PER_MINUTE"), default=60
)
MFA_RATE_LIMIT_PER_MINUTE = _as_int(
    os.getenv("ZTAC_MFA_RATE_LIMIT_PER_MINUTE"), default=20
)

raw_origins = os.getenv("ZTAC_CORS_ALLOW_ORIGINS", "*")
CORS_ALLOW_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
CORS_ALLOW_CREDENTIALS = _as_bool(os.getenv("ZTAC_CORS_ALLOW_CREDENTIALS"), default=True)


def validate_runtime_config() -> None:
    if IS_PRODUCTION:
        if SECRET_KEY == "dev-only-change-me" or len(SECRET_KEY) < 32:
            raise RuntimeError(
                "In production, set ZTAC_SECRET_KEY to a strong value (>= 32 chars)."
            )

        if "*" in CORS_ALLOW_ORIGINS:
            raise RuntimeError(
                "Wildcard CORS is not allowed in production. Set explicit ZTAC_CORS_ALLOW_ORIGINS."
            )

        if MFA_DEBUG_MODE:
            raise RuntimeError(
                "MFA debug mode must be disabled in production (set ZTAC_MFA_DEBUG_MODE=false)."
            )

