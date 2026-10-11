# Preventix Phases 8–9 delivery notes

## Phase 8 — workflow automation and operational analytics

- `POST /api/automation/run` checks active machine states and maintenance dates and creates idempotent unresolved alerts. Upcoming maintenance checks are opt-in; overdue checks are enabled by default.
- `GET /api/automation/audit` returns recent audit events, optionally filtered by entity type.
- Alert acknowledgement/resolution and maintenance status changes are recorded in `AuditEvent`.
- Successful ML inference at High/Critical risk creates a deduplicated alert. The benchmark model warning remains visible; this is not a safety or maintenance diagnosis.
- `GET /api/automation/analytics` aggregates machine status, alerts by severity, maintenance tasks by status, predictions by risk, and up to 500 recent sensor readings from the last 30 days.
- React Analytics, Predictive Maintenance, and Settings pages are connected to the API. Analytics can export recent readings to CSV.

## Phase 9 — release readiness baseline

- Added API security headers, bounded JSON payloads, and a per-process in-memory rate limiter.
- Added validation/security regression tests, Docker frontend build, Nginx SPA fallback, and deployment notes.
- API liveness/readiness endpoints remain available at `/api/health` and `/api/health/ready`.

## Required before production

This repository is **not production-secure yet**. Authentication, role-based authorization, CSRF strategy for cookie sessions, durable distributed rate limiting, managed secrets, structured centralized logging, backups/restore drills, TLS/ingress configuration, and end-to-end testing against a real MongoDB and ML service still need deployment-specific implementation. The in-memory limiter is per process and can be bypassed by restarting the server; it is only a basic local/demo guardrail. Do not expose the API directly to the public internet or use benchmark predictions for safety-critical decisions.

## Verification commands

From the repository root:

```bash
npm install
npm test
npm run build
```

The database-backed analytics endpoint and workflow automation require a reachable MongoDB connection. To test ML inference, start the FastAPI service and ensure the trained model artifact exists.
