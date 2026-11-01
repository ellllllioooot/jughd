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
| V6 | History & dashboard | End session; open dashboard | Session row: duration, alert count, accuracy; detail lists alerts; score trend renders; classifier accuracy shows share-real + sample size (US-4, US-5) |
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
