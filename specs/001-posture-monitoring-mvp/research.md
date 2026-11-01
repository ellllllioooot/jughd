# Phase 0 Research: Jughd Posture Monitoring MVP

**Date**: 2026-11-01 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All Technical Context unknowns are resolved below; no `NEEDS CLARIFICATION`
remains. No research agents were dispatched — every decision is mainstream,
documented stack practice resolved directly (the user's input fixed the stack).

## 1. Pose Detection Runtime

**Decision**: `@mediapipe/tasks-vision` `PoseLandmarker` (BlazePose GHUM,
33 landmarks), WASM/WebGL in the browser. Model: `lite` on low-power devices,
`full` default; input downscaled to ~256px before inference.

**Rationale**: This is the maintained home of BlazePose; the older
`@tensorflow-models/pose-detection` package is legacy. Runs fully client-side
(Constitution I/II): sandboxed WASM, no server involvement, 33 keypoints cover
neck/shoulder/trunk geometry (ears, shoulders, hips).

**Alternatives considered**: `@tensorflow-models/pose-detection` with the pure
TFJS runtime — constitution-literal but unmaintained; kept as a swap option if a
unified TFJS runtime is wanted for ML v2. Cloud pose APIs — rejected outright
(pixels would leave the device; constitution violation).

## 2. v1 Comparison Geometry (the "classifier" today)

**Decision**: Angle-and-ratio comparison against the calibrated baseline, in a
torso-normalized coordinate frame. Signals per category: **neck** — ear-to-
shoulder vertical offset and head-forward angle (craniovertebral proxy);
**shoulders** — shoulder-line tilt and ear-to-shoulder shortening (rounding
proxy); **slouch** — shoulder-to-hip trunk lean vs baseline. Detection state
machine: deviation must exceed `θ_high` for `T_sustain` (3s) to raise an alert;
recovery below `θ_low` (`θ_high · 0.7`, hysteresis) returns to OK; a category
re-alerts only after recovery or `T_cooldown` (60s) — satisfying FR-006.
All thresholds live in one tunable config, computed per-user from baseline
variance captured during calibration.

**Scientific basis (Constitution III)**: Deviation thresholds are
health-related and each signal family carries its citation:

- **Neck (forward-head angle)** — Hansraj KK, "Assessment of Stresses in the
  Cervical Spine Caused by Posture and Position of the Head," *Surg Technol
  Int.* 2014;25:277–279: cervical spine load rises steeply with sustained
  head-forward flexion (≈27 lb at 15°, ≈60 lb at 60°). The alert boundary is
  set relative to each user's calibrated baseline flexion, inside the range
  where load elevation is documented.
- **Shoulders and slouch (trunk/shoulder posture)** — NIOSH ergonomics
  guidance, DHHS (NIOSH) Publication No. 97-141, *Musculoskeletal Disorders
  and Workplace Factors* (1997): sustained awkward shoulder and trunk postures
  are established MSD risk factors; the alert boundary targets return toward
  the neutral calibrated posture.

Every threshold config entry MUST record its source id (hansraj-2014 or
niosh-97-141); the citation test in web/tests/content.test.ts verifies this
(tasks T041).

**Rationale**: Scale/depth-invariant (normalizing by shoulder–hip distance),
explainable (each alert names its geometric reason — SC-003), tunable per user,
and needs no training data. Hysteresis + sustain + cooldown prevents alert
storms.

**Alternatives considered**: Fixed absolute pixel thresholds — camera-distance
dependent, rejected. Single global thresholds for all users — worse false-alert
rate (SC-004); rejected in favor of baseline-relative ones. Waiting for an ML
classifier — contradicts Constitution IV phase 1 and ships no value now.

## 3. Notification Delivery (background tabs)

**Decision**: Two channels. (a) Posture alerts: detected client-side, shown via
`ServiceWorkerRegistration.showNotification()` — reliable regardless of tab
focus, no server round-trip. (b) Web Push (VAPID, `web-push` on the server,
subscription stored per user) for server-initiated notices (quota warnings,
future reminders). Sound: in-page Web Audio, user-toggleable, starts only after
a user gesture (autoplay policy).

**Rationale**: User-directed stack ("Web Push API with service worker").
Client-side detection means the posture alert must not depend on a server hop;
the service worker is the reliable display path in unfocused/background tabs.
Push covers the genuinely server-initiated cases.

**Alternatives considered**: Plain `Notification()` from the page — works but
degrades in background/edge cases and was explicitly superseded by the user's
stack direction. Relaying every alert through the server as a push — adds
latency and a server dependency to the safety-critical path; rejected.

## 4. Background-Tab Timer Throttling

**Decision**: Run detection in a **dedicated Web Worker** (frames via
`createImageBitmap(video)` on a 50–100ms interval; main thread stays smooth for
animations). When `document.hidden`, start a silent keepalive (Web Audio,
gain 0) — audio-active pages are exempt from intensive timer throttling in
Chromium. Degrade gracefully if throttled anyway: widen `T_sustain`, surface a
"background monitoring may be delayed" hint, and never fail silently.

**Rationale**: Browsers throttle hidden-tab timers to ~1/min after ~5 minutes,
which would break SC-002 (alerts within 2s in background). Worker isolation
also protects Constitution II's bounded-resource goal and UI smoothness.

**Alternatives considered**: Foreground-only monitoring — contradicts spec US-2
("works in background tab"). WebRTC loopback keepalive — heavier than silent
audio for the same throttling exemption. Accepting throttling — fails SC-002;
rejected.

## 5. Authentication & Password Storage

**Decision**: Email/username + password; server-side sessions stored in
PostgreSQL, `httpOnly`, `SameSite=Lax`, `Secure`-in-prod cookie (`sid`).
Passwords hashed with built-in `node:crypto` **scrypt** (N=2^15, r=8, p=1,
per-user 16-byte salt). Login rate-limited per IP + per account.

**Rationale**: Revocable sessions (logout is real), zero native addons
(Constitution II — `bcrypt`/`argon2` native bindings need manual-memory C or
native toolchains; scrypt is a proper KDF inside Node core). Cookie sessions
avoid JWT revocation complexity for a single-VPS product.

**Alternatives considered**: JWT (stateless) — logout/revocation complexity not
worth it here. `bcrypt`/`argon2` native addons — constitution friction; pure-JS
`bcryptjs` is slow and unmaintained-ish. OAuth/SSO — out of scope (spec).

## 6. API Style

**Decision**: Versioned REST/JSON under `/api/v1`, cookie auth, error envelope
`{error: {code, message}}` with machine codes localized to Persian in the web
client. Request validation at the boundary (zod), contract-tested.

**Rationale**: ~20 endpoints, plain CRUD + aggregates; REST is the smallest
thing that works and contract-testable (constitution's trust-boundary
validation). Persian copy stays in the web layer; the API stays
language-neutral.

**Alternatives considered**: tRPC — couples client/server TS but adds tooling;
GraphQL — no client-driven query needs; rejected both as ceremony.

## 7. Persistence & ORM

**Decision**: PostgreSQL 16 + Prisma (user-directed). Landmark arrays stored as
`Json` columns of plain numbers (33×3 ≈ 100 floats ≈ 1KB/alert). Indexes:
`MonitoringSession(userId, startedAt)`, `Alert(sessionId)`, `Alert(userId)`.
Migrations via `prisma migrate`; `migrate deploy` on API boot in containers.
Quota accounting **derived**: `SUM(duration)` of the month's sessions — no
counter table, no drift.

**Rationale**: Prisma gives typed queries and reviewable migrations. Derived
quota is self-healing (matches spec's "never exceeds" SC-005 exactly). Json
columns beat an EAV table for fixed-shape landmark data.

**Alternatives considered**: Drizzle/TypeORM — user chose Prisma. `real[]`
columns — harder to evolve shape; Json chosen for snapshot flexibility.
Increment counter table — drift risk on crashes; rejected.

## 8. Client Architecture & Design System

**Decision**: React 19 + Vite + TypeScript. The detection engine is imperative
(EventTarget-based, outside React) exposed through thin hooks — no state
library needed. Design system: CSS custom-property tokens with **logical
properties** (`margin-inline-start` etc.) for RTL, `dir="rtl"` at root,
Vazirmatn font, Persian numerals in copy, owl-themed Jughd identity (custom SVG
mascot, night-indigo + amber palette). Animations: CSS transitions/WAAPI,
purposeful only (feedback, orientation), all gated on
`prefers-reduced-motion`.

**Rationale**: The engine's event stream doesn't fit React's render cycle;
keeping it imperative avoids a state-management dependency. Logical properties
make RTL native rather than a mirrored afterthought (Constitution VII).

**Alternatives considered**: Zustand/Redux — unnecessary for one event stream.
Framer Motion — dependency weight for what CSS/WAAPI does; may revisit if
orchestration needs grow. LTR-then-mirror — fights the layout constantly;
rejected.

## 9. Deployment Topology

**Decision**: Docker Compose with two profiles. **dev**: `db`, `api` (watch
mode), `web` (Vite dev server, proxying `/api`). **prod**: `db`, `api` (built),
`web` (static build) + **Caddy** reverse proxy with automatic HTTPS. Secrets via
`.env` (VAPID keys, DB URL, session secret). Single Linux VPS, SSH access,
`docker compose --profile prod up -d`.

**Rationale**: Webcam APIs require a secure context — HTTPS is mandatory in
prod, and Caddy is the least-config TLS terminator. Same compose file for dev
and prod keeps drift low (Constitution §2: reproducible, pinned images).

**Alternatives considered**: nginx — more config for the same TLS result.
Vite dev-only on VPS — not production-grade. Managed cloud — constitution
forbids.

## 10. Feedback Durability (verdicts never lost)

**Decision**: Client-side **outbox** (localStorage) keyed by client-generated
UUIDs; alerts and verdicts queued during sessions, flushed with idempotent
upserts on an interval, on session end, and on `online` events; exponential
backoff on failure.

**Rationale**: Spec FR: network failure must never drop verdicts; idempotent
upserts (unique `clientKey`) make retries safe. localStorage is ample (≤2KB per
alert) and survives reloads.

**Alternatives considered**: IndexedDB — more robust but more code; localStorage
suffices at this payload size. Fire-and-forget POSTs — loses data on flaky
networks; rejected (spec explicitly requires queuing).

## 11. Global Stats & Dashboard Aggregates

**Decision**: On-demand SQL aggregates for both public global stats (counts of
users/sessions/monitored hours/alerts, 60s in-memory cache) and the per-user
dashboard summary (score trend by day, alert-confirmation rate with sample
size). No materialized counters in v1.

**Rationale**: At 10k users these aggregates are cheap; caching absorbs the
landing-page traffic. Zero sync bugs (constitution II: bounded, simple).

**Alternatives considered**: Background rollup tables — premature; revisit if
aggregate queries exceed ~200ms at scale.

## 12. Wellness Content (tips, exercises, eye breaks)

**Decision**: Static typed content modules in `web/src/content/` — each tip,
exercise, and break rule carries `title_fa`, `body_fa`, `category`
(neck/shoulders/slouch/general), `citation` {source, reference, url}. Eye
breaks follow the 20-20-20 rule at 20-minute continuous-session intervals with
the rationale shown. Dashboard ranks content by the user's alert-category mix
client-side.

**Rationale**: Constitution III requires traceable citations — making citation a
required field makes the review gate mechanical. Static content ships with the
app, needs no API, and is trivial to audit for scientific basis.

**Alternatives considered**: DB-seeded content table + API — allows edits
without deploy but adds endpoints and admin surface nobody asked for; rejected
for v1.
