# Architecture

## Components

```
browser                                server (Docker: api, web, caddy)
┌─────────────────────────────┐        ┌───────────────────────────┐
│ camera → Web Worker          │        │ Express + Prisma + PG 16  │
│  MediaPipe PoseLandmarker    │  HTTPS │  scrypt cookie sessions   │
│  (BlazePose, 33 landmarks,   │───────▶│  sessions/alerts/quota    │
│   20 fps cap, ~256px input)  │ JSON   │  web-push (VAPID)         │
│ geometry engine → alerts     │◀───────│  stale-session sweep      │
│ outbox (localStorage)        │        └───────────────────────────┘
└─────────────────────────────┘
```

## Data flow — the landmark-only path (constitution I)

1. `pose-worker.ts` runs MediaPipe off the main thread on downscaled
   `ImageBitmap`s (≤20 fps, fixed `Float32Array(132)` buffers, deterministic
   `bitmap.close()`). The frame itself is never stored or sent.
2. `geometry.ts` derives torso-normalized features (ear–shoulder offset, head
   forward angle, shoulder tilt, trunk lean) → signals for NECK / SHOULDER /
   SLOUCH against the user's baseline. Pure functions, unit-tested.
3. `alert-manager.ts` runs a state machine per category:
   `OK → PENDING (≥θ_high) → ALERTED (after 3 s sustain)`, re-alert only after
   recovery (`<θ_low = 0.7·θ_high`) or 60 s cooldown. Paused time (person
   absent) counts toward neither the posture score nor quota.
4. Alerts carry a 33-landmark **numeric** snapshot. `validation.ts` accepts
   only finite x/y/z + score 0–1 per landmark, `.strict()` — string, null, or
   base64/blob fields are rejected (400), never stripped. Schema has zero
   binary columns; `api/tests/privacy.test.ts` audits both.
5. `outbox.ts` persists alerts/verdicts in `localStorage` keyed by client
   UUIDs and replays them idempotently (exponential backoff) when online.
   Sessions finalize via `fetch(..., {keepalive: true})` on unload; the server
   sweep completes anything still ACTIVE after 2 h.

## Auth

`sid=<sessionId>.<rawToken>` cookie (HttpOnly, SameSite=Lax); the DB stores
only `sha256(tokenHash)`. Passwords: scrypt (N=2^15, r=8, p=1, per-user salt,
params in the hash string) from `node:crypto` — no native addons
(constitution II). Sliding 7-day expiry, 30-day absolute cap; login rate
limited per IP and per account.

## Quota

`SUM(durationSec)` per UTC calendar month vs the tier limit (FREE = 12 h,
PRO placeholder = 10×). End-write clamps duration to the remaining allowance
(SC-005: overages are zero) while preserving score/alerts; a truncated
session ends `QUOTA_EXHAUSTED` and triggers a web-push warning. Near-limit
(<30 min) pushes warn ahead of time.

## Error envelope

`{"error": {"code", "message"}}` with codes `VALIDATION_ERROR`, `EMAIL_TAKEN`,
`USERNAME_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHORIZED`, `NOT_FOUND`,
`NO_BASELINE`, `QUOTA_EXHAUSTED`, `ALREADY_VERIFIED`, `RATE_LIMITED`,
`INTERNAL` — every code mapped to Persian copy (`web/src/lib/messages.ts`,
asserted by `web/tests/copy.test.ts`).

## Citations appendix (constitution III)

Every threshold and wellness record carries `citation {source, reference, url}`
(`web/src/content/index.ts`, `web/src/engine/thresholds.ts`; verified by
`web/tests/content.test.ts`):

| source | used for | reference |
|---|---|---|
| `hansraj-2014` | neck (head-forward) thresholds & tips | Hansraj KK, "Assessment of Stresses in the Cervical Spine Caused by Posture and Position of the Head," Surg Technol Int. 2014;25:277–279 — https://pubmed.ncbi.nlm.nih.gov/25393825/ |
| `niosh-97-141` | shoulder/slouch thresholds, tips, exercises | DHHS (NIOSH) Publication No. 97-141, Musculoskeletal Disorders and Workplace Factors (1997) — https://www.cdc.gov/niosh/docs/97-141/ |
| `aao-20-20-20` | 20-20-20 eye-break rule | American Academy of Ophthalmology, "Computers, Digital Devices, and Eye Strain" — https://www.aao.org/eye-health/tips-prevention/computer-usage |

Signal thresholds: θ_high = 0.10 (NECK/SHOULDER), 0.12 (SLOUCH); θ_low =
0.7·θ_high; sustain 3 s; cooldown 60 s. v1 feedback is pure labeling
("real"/"false") for a future data set — no machine-learning claims are made.
