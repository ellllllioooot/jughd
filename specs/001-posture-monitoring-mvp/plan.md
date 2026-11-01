# Implementation Plan: Jughd Posture Monitoring MVP

**Branch**: `001-posture-monitoring-mvp` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-posture-monitoring-mvp/spec.md`

## Summary

Webcam-based posture monitoring SaaS with a Persian RTL UI: in-browser BlazePose
landmark detection, baseline calibration, geometric deviation detection with
categorized alerts (neck/shoulders/slouch), user verdicts forming a labeled
dataset, session history and insights dashboard, freemium quota, and a public
landing page with live global stats.

Technical approach: React + Vite SPA and an Express REST API over PostgreSQL via
Prisma. All webcam processing stays client-side — the server only ever receives
landmark coordinates and derived metrics. Alerts surface through service-worker
notifications (Web Push reserved for server-initiated notices). The v1 engine is
pure geometry with hysteresis; its feedback pipeline is the training data for
future TensorFlow.js phases. Docker Compose serves dev and VPS deployment behind
Caddy TLS.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS (API), evergreen browsers (web)

**Primary Dependencies**: React 19 + Vite (web); Express (api); Prisma ORM;
@mediapipe/tasks-vision PoseLandmarker (BlazePose GHUM, 33 landmarks); web-push
(VAPID); TensorFlow.js deferred to ML phases v2/v3

**Storage**: PostgreSQL 16 — accounts, baselines, monitoring sessions, alerts,
auth sessions, push subscriptions (landmarks as JSON number arrays; no binary
media columns anywhere)

**Testing**: Vitest for unit and API tests (supertest); quickstart manual
scenarios for end-to-end validation (webcam E2E is device-bound)

**Target Platform**: Modern desktop browsers with webcam (secure context
required); Linux VPS via Docker Compose

**Project Type**: Web application — SPA frontend + REST API backend

**Performance Goals**: Detection loop ≥15 fps sustained on mid-range hardware;
alert within 2s of sustained deviation (SC-002); dashboard with 3 months of
history <2s (SC-006); 60fps UI animations with reduced-motion fallback

**Constraints**: No image/video ever leaves the browser (Constitution I, NON-
NEGOTIABLE); HTTPS-only secure context (webcam requirement); bounded memory in
the detection loop (Constitution II); background-tab alert delivery (spec
US-2/SC-002) — see research.md for throttling mitigation

**Scale/Scope**: 2 apps (web, api), ~20 REST endpoints, 7 persistent entities,
target 10k users; single-VPS deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Design evidence |
|-----------|--------|-----------------|
| I. Privacy-first, on-device (NON-NEGOTIABLE) | PASS | Detection in browser; API accepts only landmark coordinates + derived metrics; schema has no media/blob columns; contract tests assert payloads are numbers/strings only |
| II. Memory safety & resource efficiency | PASS | Node.js/TypeScript everywhere; no manual-memory native addons (passwords via built-in `node:crypto` scrypt, not C bcrypt); Prisma engine is Rust-compiled (memory-safe); MediaPipe runs as sandboxed WASM/WebGL in browser; detection loop bounded (20 fps cap, fixed-size buffers) |
| III. Scientific basis for health features | PASS | Tips, exercises, and eye-break rules are content records each carrying a citation + link (e.g., 20-20-20 rule); citation review is a quality gate in tasks |
| IV. Progressive, feedback-driven ML | PASS | v1 is pure geometry (no model); every alert stores landmarks + verdict → labeled dataset (FR-018); TFJS dependency added only when v2 starts |
| V. Traceable development history | PASS | Repo initialized; granular conventional commits continue on `001-posture-monitoring-mvp` |
| VI. Documentation for handoff & publication | PASS | This plan, research.md, data-model.md, contracts/, quickstart.md; docs-updated-together enforced in tasks |
| VII. Distinctive Persian RTL experience | PASS | Design tokens RTL-first (logical properties), `dir="rtl"`, Persian numerals, Vazirmatn typography, owl-themed Jughd identity, purposeful animation honoring `prefers-reduced-motion` |

**Gate result: PASS with one justified deviation** (tracked in Complexity
Tracking): Constitution §2 names "TensorFlow.js models" for landmark
extraction; this plan uses MediaPipe's BlazePose (`@mediapipe/tasks-vision`) per
the explicit stack direction. It is browser-side, sandboxed WASM/WebGL — fully
compliant with Principle II — and a one-line MINOR amendment to §2 wording is
proposed (see Complexity Tracking).

**Post-design re-check (after Phase 1)**: PASS — data model stores only
coordinates and derived numbers; contracts expose no media endpoints; content
citations are a first-class field; quickstart validation scenarios map to the
success criteria. No new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-posture-monitoring-mvp/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/                             # React + Vite SPA (Persian RTL)
├── src/
│   ├── app/                     # routes, providers, session bootstrap
│   ├── components/              # design-system components (owl theme)
│   ├── design/                  # tokens, animations, RTL primitives
│   ├── features/
│   │   ├── auth/                # register, login
│   │   ├── monitor/             # calibration, live session, alerts, feedback
│   │   ├── dashboard/           # history, trends, tips, exercises, breaks
│   │   └── landing/             # marketing page + live global stats
│   ├── engine/                  # pose worker, geometry engine, alert manager
│   ├── lib/                     # api client, push, outbox queue, storage
│   └── content/                 # tips, exercises, eye-break rules (+ citations)
├── public/
│   └── sw.js                    # service worker: notification display
└── tests/                       # Vitest: geometry, quota math, content citations

api/
├── src/
│   ├── routes/                  # auth, baselines, sessions, alerts, quota, push, stats
│   ├── services/                # quota, sessions, feedback, aggregates
│   ├── lib/                     # prisma, auth (scrypt sessions), validation
│   └── app.ts                   # Express app wiring
├── prisma/
│   └── schema.prisma            # schema + migrations
└── tests/                       # Vitest + supertest contract tests

docker-compose.yml               # profiles: dev | prod
Caddyfile                        # reverse proxy + TLS (webcam secure context)
```

**Structure Decision**: Web-application layout (frontend + backend split as
`web/` and `api/`). No shared code package — the REST contract
([contracts/api.md](./contracts/api.md)) is the single source of truth and
contract tests on both sides catch drift.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution §2 wording: landmark extraction via MediaPipe WASM rather than "TensorFlow.js models" | User-mandated stack ("MediaPipe BlazePose"); maintained BlazePose path in 2026 is `@mediapipe/tasks-vision` | The TFJS-runtime BlazePose package is legacy/unmaintained; the deviation is a one-line §2 MINOR amendment (landmark extraction "via in-browser models — MediaPipe BlazePose or TensorFlow.js"), proposed to the constitution owner |
