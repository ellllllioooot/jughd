# Phase 1 Contracts: Jughd REST API v1

**Date**: 2026-11-01 | **Plan**: [plan.md](./plan.md) | **Data model**: [data-model.md](../data-model.md)

Base path: `/api/v1`. Format: JSON. Auth: `sid` httpOnly cookie (see
`/auth/*`). **Privacy invariant (Constitution I): request and response payloads
carry only numbers, strings, and enums — no endpoint accepts or returns image or
video bytes.** Contract tests assert this on every route.

## Conventions

- Errors: `4xx/5xx` with envelope `{"error": {"code": "QUOTA_EXHAUSTED", "message": "..."}}`.
  `code` is a stable machine enum; the web client renders Persian copy.
- Timestamps: ISO-8601 UTC. Landmark arrays: `[{x, y, z, score}]`, 33 entries,
  normalized `[0,1]` coordinates.
- Idempotency: alert writes carry client `clientKey` (unique) — replays are no-ops.
- All routes except `/auth/register`, `/auth/login`, `/stats/global` require auth.

## Endpoints

### Auth

| Method & Path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `POST /auth/register` | `{email, username, password}` | `201 {user}` + cookie | password ≥8 chars; 409 `EMAIL_TAKEN` / `USERNAME_TAKEN` |
| `POST /auth/login` | `{emailOrUsername, password}` | `200 {user}` + cookie | rate-limited; 401 `INVALID_CREDENTIALS` (generic) |
| `POST /auth/logout` | — | `204` | revokes server session |
| `GET /auth/me` | — | `200 {user, quota}` | `quota` shape per `/quota` |

`user` = `{id, email, username, tier, createdAt}` (never includes `passwordHash`).

### Quota

| Method & Path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `GET /quota` | — | `200 {usedSeconds, limitSeconds, periodStart, periodEnd, exhausted}` | derived from session durations (data-model.md) |

### Calibration

| Method & Path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `POST /baselines` | `{landmarks, torsoScale}` | `201 {baseline}` | calibrate/recalibrate; stores newest as current |
| `GET /baselines/current` | — | `200 {baseline}` / `404 NO_BASELINE` | |

`baseline` = `{id, landmarks, torsoScale, createdAt}`.

### Sessions & Alerts

| Method & Path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `POST /sessions` | `{baselineId}` | `201 {session}` | quota enforced; `402`-style `QUOTA_EXHAUSTED` code when blocked |
| `PATCH /sessions/:id/end` | `{endedAt, durationSec, accuracyScore, alertCount}` | `200 {session}` | server clamps values (data-model rules); sets `COMPLETED` or `QUOTA_EXHAUSTED` |
| `POST /sessions/:id/alerts` | `{alerts: [{clientKey, category, occurredAt, landmarksSnapshot}]}` | `200 {stored: n, ids: {clientKey: id}}` | idempotent batch upsert (outbox flush) |
| `PATCH /alerts/:id/verdict` | `{verdict: "REAL" \| "FALSE"}` | `200 {alert}` | terminal; `409 ALREADY_VERIFIED` if repeated with different verdict |
| `GET /sessions?cursor&limit` | — | `200 {items: [{session}], nextCursor}` | newest first |
| `GET /sessions/:id` | — | `200 {session, alerts: [{alert}]}` | owner-only (404 otherwise) |

`session` = `{id, baselineId, startedAt, endedAt, durationSec, alertCount,
accuracyScore, status}`. `alert` = `{id, clientKey, category, occurredAt,
landmarksSnapshot, verdict, verdictAt}`.

### Dashboard

| Method & Path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `GET /dashboard/summary` | — | `200 {scoreTrend: [{date, score}], alertAccuracy: {real, confirmed, rate}, recentSessions: [{session}]}` | trend = daily avg accuracy; `rate` null when `confirmed = 0` |

Tips, exercises, and eye-break content ship in the web client
(`web/src/content/`) — no endpoints (research.md §12).

### Push

| Method & Path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `POST /push/subscribe` | `{endpoint, p256dh, auth}` | `201` | stores Web Push subscription |
| `DELETE /push/subscribe` | `{endpoint}` | `204` | unsubscribe |

Server-initiated pushes use VAPID; posture alerts themselves are local
(SW `showNotification`) and never round-trip (research.md §3).

### Public

| Method & Path | Request | Response | Notes |
|---------------|---------|----------|-------|
| `GET /stats/global` | — | `200 {users, sessions, monitoredHours, alerts}` | anonymized totals, 60s cache; no auth |

## Client-Side Contracts (not HTTP)

- **Detection engine → UI**: events `calibrated`, `posture:ok`, `posture:deviation
  {category}`, `alert {id, category, occurredAt, snapshot}`, `paused`, `resumed`.
- **Engine → outbox**: alert records queued to localStorage, flushed via
  `POST /sessions/:id/alerts` + `PATCH /alerts/:id/verdict` (research.md §10).
- **Service worker** (`sw.js`): receives `show-notification {title, body, tag,
  sound}` messages from the page and displays notifications; handles
  `notificationclick` → focuses/opens the app.

## Content Record Schema (web-side)

```text
{ id, title_fa, body_fa, category: NECK|SHOULDER|SLOUCH|GENERAL,
  citation: {source, reference, url} }   // citation REQUIRED (Constitution III)
```
