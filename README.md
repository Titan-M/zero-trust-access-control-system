# Context-Aware Zero-Trust Access Control System

This repository contains an academic project prototype for a context-aware Zero-Trust access control system for secure web applications.

## Team

- Student 1: Maandar Devaneson (C148)
- Student 2: Manthan Maheshwari (C151)

## Project Goals

- Build a secure authentication system.
- Evaluate each protected-resource request with contextual risk scoring.
- Enforce dynamic policy decisions: `ALLOW`, `MFA_REQUIRED`, or `DENY`.
- Store detailed audit logs for all access attempts.
- Provide an admin monitoring dashboard for suspicious activity.

## Repository Structure

- `docs/project-outline.md` - formal project outline
- `backend/` - FastAPI API, authentication, risk engine, policy engine, and audit logs
- `frontend/` - Next.js frontend dashboard (TypeScript, responsive UI, live API integration)

## Quick Start

1. Open terminal in `backend/`.
2. Create virtual environment:
   - Windows PowerShell: `python -m venv .venv; .\.venv\Scripts\Activate.ps1`
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Run API:
   - `uvicorn app.main:app --reload`
5. Open a second terminal in `frontend/`.
6. Install dependencies:
   - `npm install`
7. Start frontend:
   - `npm run dev`
8. Open:
   - `http://localhost:3000`

## Production Readiness Baseline

This repository now includes a production-focused baseline:

- Environment-aware backend configuration (`development` / `production`)
- Runtime safety checks for weak secrets and unsafe CORS in production
- Request tracing headers (`x-request-id`) and request timing logs
- Trusted host enforcement and optional HTTPS redirect middleware
- Basic in-memory rate limiting for auth, access, and MFA endpoints
- Admin endpoint hard limits for audit log query size
- End-to-end MFA flow in frontend (challenge + verify)
- Dockerfiles for backend/frontend and `docker-compose.yml` for local deployment

## Environment Configuration

- Backend template: `backend/.env.example`
- Frontend template: `frontend/.env.example`

Important production settings:

- `ZTAC_ENV=production`
- `ZTAC_SECRET_KEY=<long-random-secret-at-least-32-chars>`
- `ZTAC_MFA_DEBUG_MODE=false`
- `ZTAC_CORS_ALLOW_ORIGINS=<comma-separated-allowed-origins>`

## Local Production-like Run (Docker)

1. Update the placeholder secret in `docker-compose.yml`.
2. Start all services:
   - `docker compose up --build`
3. Open:
   - Frontend: `http://localhost:3000`
   - Backend health: `http://localhost:8000/health`
   - Backend readiness: `http://localhost:8000/ready`

## Remaining Steps for Full Production Rollout

1. Replace in-memory rate limiter with Redis-backed distributed rate limiting.
2. Move from SQLite to managed PostgreSQL.
3. Add automated tests and CI/CD checks (lint, typecheck, API tests).
4. Add secret management (Vault/KMS) and rotate signing keys periodically.
5. Deploy behind a reverse proxy (Nginx/Traefik) with TLS termination and HSTS.
