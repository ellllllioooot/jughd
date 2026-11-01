# Quickstart & Validation Guide: Jughd Posture Monitoring MVP

**Date**: 2026-11-01 | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/api.md](./contracts/api.md)

Runnable validation for the feature end-to-end. Implementation lives in
`tasks.md` execution — this guide says how to prove it works.

## Prerequisites

- Docker + Docker Compose; Node.js 22 (for non-container runs)
- A modern desktop browser (Chromium recommended) with a webcam
- HTTPS or `localhost` (secure context required for camera access)

## Setup (dev profile)

```bash
git clone <repo> && cd posture-app
cp .env.example .env            # DB URL, session secret; VAPID keys generated in setup
docker compose --profile dev up # db + api (watch) + web (Vite dev)
docker compose exec api npx prisma migrate dev   # first run only
```

Open `http://localhost:5173` — the Vite dev server proxies `/api` to the API
service. Generate VAPID keys once (`npx web-push generate-vapid-keys`) and put
them in `.env` before testing push.

## Validation Scenarios

Each scenario maps to a spec acceptance path; run in order on a fresh account.

| # | Scenario | Steps | Expected outcome (spec ref) |
|---|----------|-------|------------------------------|
| V1 | Register & sign in | Register with email/username/password; sign out; sign back in | Account created, workspace private; duplicate email/username shows Persian inline error (US-1) |
| V2 | Calibration | Grant webcam, sit upright, press calibrate | Baseline captured; monitoring starts (US-2, FR-003) |
| V3 | Alert with reason | Lean into forward-head posture for >3s | Alert naming **neck** within 2s of sustained deviation; repeats only after recovery/cooldown (SC-002, SC-003, FR-006) |
| V4 | Background tab | Hide the tab, slouch for >3s | Browser notification appears with reason; no missed alert >2s after sustain (US-2, SC-002) |
| V5 | Verdict labeling | Mark one alert real, one false; kill network, mark a third, reconnect | All verdicts + landmark snapshots persisted; queued verdict delivered after reconnect, none lost (US-3, FR-007) |
| V6 | History & dashboard | End session; open dashboard | Session row: duration, alert count, posture score; detail lists alerts; posture-score trend renders; classifier accuracy shows share-real + sample size (US-4, US-5) |
| V7 | Wellness content | Run a session past 20 min; view tips/exercises | Eye-break reminder at interval with cited rationale; exercises prioritized to alert categories; every item shows a source (SC-007, FR-012/013) |
| V8 | Quota & upgrade | Check quota meter; drive usage to the 12h cap | Meter counts monitored time; at zero, new session blocked with upgrade prompt showing paid tiers; no payment flow anywhere (US-6, SC-005) |
| V9 | Landing stats | Sign out; open landing page | Live anonymized totals render and move as sessions complete elsewhere (US-7, FR-015) |
| V10 | Privacy invariant | Inspect all network traffic during V2–V5 | Only JSON with landmark numbers/metrics leaves the browser — zero image/video bytes (SC-008, Constitution I) |

## Automated Checks

```bash
docker compose exec api npm test   # unit + contract tests (supertest), quota math
docker compose exec web npm test   # geometry engine, alert state machine, content citations
```

Contract tests must assert the privacy invariant (no binary fields) on every
route; geometry tests cover hysteresis/sustain/cooldown transitions.

## Production Deploy (VPS)

```bash
# on the VPS, from the repo root
cp .env.example .env    # fill secrets; set domain for Caddy TLS
docker compose --profile prod up -d --build
docker compose exec api npx prisma migrate deploy
```

Caddy terminates TLS automatically (webcam requires HTTPS). Verify V1–V10 once
against the deployed URL; check `GET /api/v1/stats/global` responds publicly.

## Validation Results (2026-11-01, T055–T056)

Prod stack verified locally: `docker compose --profile prod up -d --build`
(db + api + web/nginx + caddy), `prisma migrate deploy` applied
`20261101175203_init`, and the TLS smoke passed — `https://localhost/` 200,
`/api/v1/stats/global` public JSON, `/dashboard` SPA fallback 200, port 80
redirects 308 → https, protected routes 401. Automated suites: api 37/37,
web 26/26.

V1–V10 run against the deployed URL (`https://localhost`). Server-side
scenarios executed live over HTTPS; webcam/human scenarios validated by unit
tests and left for a device pass as noted.

| # | Result | Evidence |
|---|--------|----------|
| V1 | PASS (live) | register 201, duplicate email/username 409, logout 204, wrong password 401 `INVALID_CREDENTIALS`, login 200 — over HTTPS with cookie sessions |
| V2 | PASS (API) / manual (camera) | baseline + session created live; the webcam grant + physical calibration is device-manual (covered by `geometry.test.ts` calibration math) |
| V3 | manual (camera) | physical forward-head >3 s needs a human + webcam; the alert state machine (sustain 3 s, hysteresis 0.7·θ, cooldown 60 s, reason copy) is fully covered by `web/tests/geometry.test.ts` (18 tests) |
| V4 | manual (camera + notifications) | hidden-tab slouch needs a device; SW notification path + background-delayed hint implemented (T027–T028), keepalive exemption covered by construction |
| V5 | PASS (live) | alert persisted 200 `{stored, ids}`; replay returns `stored: 0` + same id (idempotent); verdict REAL 200; conflicting verdict 409 `ALREADY_VERIFIED`; 33-landmark snapshot persisted; offline queue + backoff covered by `alerts.test.ts` |
| V6 | PASS (live) | session end 200; history list row (duration, alert count, score); detail lists alert + verdict + snapshot; dashboard summary: trend `[{date, 85}]`, accuracy `{real:1, confirmed:1, rate:1}` |
| V7 | PASS (unit) / manual (20-min run) | tips/exercises/eye-break all cited (`content.test.ts`); ranking by alert mix unit-tested; the 20-minute reminder itself needs a real 20-min session on a device |
| V8 | PASS (live + tests) | quota `{used, 43200, exhausted:false}` agrees with the session row (wall-time clamp verified: reported duration is clamped to elapsed, SC-005); gate-at-zero 402 + PRO tier 10× covered by `quota.test.ts`; tier cards + disabled upgrade (no payment) in UI |
| V9 | PASS (live) | public totals moved exactly +1 user / +1 session / +1 alert after a session completed across a 60 s cache lapse (`{6,5,0,2} → {7,6,0,3}`) |
| V10 | PASS (live + tests) | base64 `blob` field and string coordinates rejected 400 on baselines and alert snapshots during the live run; schema has zero binary columns (`privacy.test.ts`) |

One bug found by the live run and fixed: malformed alert ids (`/alerts/not-a-uuid/verdict`)
returned 500; Prisma validation errors now map to 400 `VALIDATION_ERROR`
(`api/src/lib/errors.ts`, regression test in `alerts.test.ts`).

Known device-manual remainder: V2–V4 camera paths, V4 notification display,
and V7's real-time 20-minute eye-break tick — run once on a laptop with a
webcam before release.
