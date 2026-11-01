# Phase 1 Data Model: Jughd Posture Monitoring MVP

**Date**: 2026-11-01 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Storage: PostgreSQL 16 via Prisma. **Hard rule (Constitution I): no column ever
holds image/video data — only numeric landmark coordinates and derived numbers.**

## Entities

### User

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | PK, generated server-side |
| email | citext | unique, valid format, ≤254 chars |
| username | text | unique, 3–32 chars, `[a-z0-9_]+` (case-insensitive unique) |
| passwordHash | text | scrypt output + params + salt, never exposed via API |
| tier | enum | `FREE` \| `PRO` (default `FREE`; future tiers extend the enum) |
| createdAt | timestamptz | set on registration |

Relationships: owns Baseline (1..n), MonitoringSession (1..n), Alert (1..n via
sessions), AuthSession (1..n), PushSubscription (1..n).

### Baseline (calibration snapshot)

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User, indexed |
| landmarks | jsonb | 33×{x,y,z,score} — numbers only; score ∈ [0,1] |
| torsoScale | float | shoulder–hip distance at calibration (normalization anchor) |
| createdAt | timestamptz | calibration time; **current baseline = latest per user** |

Recalibration inserts a new row (versioned history, no updates/deletes).

### MonitoringSession

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User, indexed (userId, startedAt) |
| startedAt | timestamptz | server-accepted at creation; quota enforced here |
| endedAt | timestamptz | null while `ACTIVE` |
| durationSec | int | ≥0; monitored (non-paused) seconds; set on end |
| alertCount | int | ≥0; denormalized from alerts on end |
| postureScore | float | 0–100 = share of monitored time in good posture |
| status | enum | `ACTIVE` \| `COMPLETED` \| `QUOTA_EXHAUSTED` |
| baselineId | uuid | FK → Baseline — which calibration the session used |

### PostureAlert

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | PK |
| clientKey | uuid | unique — idempotency key from the client outbox |
| sessionId | uuid | FK → MonitoringSession, indexed |
| userId | uuid | FK → User, indexed |
| category | enum | `NECK` \| `SHOULDER` \| `SLOUCH` |
| occurredAt | timestamptz | alert time (client clock, server-validated on write) |
| landmarksSnapshot | jsonb | 33×{x,y,z,score} at alert time — numbers only |
| verdict | enum | `UNCONFIRMED` \| `REAL` \| `FALSE` (default `UNCONFIRMED`) |
| verdictAt | timestamptz | null until verdict |

### AuthSession

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | PK; token hash stored, raw id rides in the `sid` cookie |
| userId | uuid | FK → User, indexed |
| expiresAt | timestamptz | sliding expiry, absolute cap |
| createdAt | timestamptz | — |

Logout deletes the row (immediate revocation).

### PushSubscription

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User, indexed |
| endpoint | text | unique (per browser subscription) |
| p256dh | text | key material from the browser |
| auth | text | key material from the browser |
| createdAt | timestamptz | — |

410/404 on push delivery deletes the row (dead subscription cleanup).

### Derived (no table)

- **UsageQuota** = `SUM(MonitoringSession.durationSec)` for the user's calendar
  month vs tier limit (`FREE`: 12h = 43,200s). Enforced at session start and
  mid-session (see transitions). Self-healing, zero drift.
- **GlobalAggregate** = `COUNT`/`SUM` over users, sessions, monitored hours,
  alerts; computed on request with a 60s cache for the landing page.
- **ClassifierAccuracy** = `COUNT(verdict=REAL) / COUNT(verdict≠UNCONFIRMED)`
  per user, with the denominator exposed (FR-011).

## State Transitions

```text
MonitoringSession:
  (create) → ACTIVE
  ACTIVE → COMPLETED        # user ends session
  ACTIVE → QUOTA_EXHAUSTED  # monthly allowance hit mid-session

PostureAlert.verdict:
  UNCONFIRMED → REAL | FALSE   # user confirmation (PATCH only; terminal)

User.tier:
  FREE → PRO    # upgrade flow (placeholder in this feature — no payment)
```

## Validation Rules (trust boundaries)

- All writes validate at the API boundary (zod schemas mirror this model).
- `landmarks` / `landmarksSnapshot`: arrays of finite numbers only — schema and
  contract tests reject anything else (privacy invariant: no base64/blob
  fields exist to receive pixels).
- `durationSec` and `postureScore` are client-reported (the server never sees
  frames) and clamped server-side: `0 ≤ durationSec ≤ elapsed wall time + 5%`,
  `0 ≤ postureScore ≤ 100`.
- Alert writes are scoped to the caller's own sessions (FR-017 isolation).
- Quota check is server-side on every session start and end write.

## Indexes

- `MonitoringSession (userId, startedAt)` — history + quota scans
- `Alert (sessionId)`, `Alert (userId)` — session detail, posture-score aggregates
- `Alert (clientKey)` unique — idempotent outbox flushes
- `AuthSession (userId)`, `PushSubscription (userId)`
