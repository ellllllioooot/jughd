# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Pre-given in the feature brief, not chosen here: React 19 + Vite SPA (TypeScript 5.x) and a Node.js 22 / Express REST API over PostgreSQL 16 via Prisma; MediaPipe BlazePose (`@mediapipe/tasks-vision`) for in-browser landmark detection; Docker Compose on a single Linux VPS behind Caddy TLS (HTTPS is a hard requirement — webcam needs a secure context). TensorFlow.js is deferred to ML phases v2/v3. Full dependency and structure detail lives in `specs/001-posture-monitoring-mvp/plan.md`.

## Users

Primary: anyone at a desk — Persian-speaking people who sit at a computer for long stretches, in any context (work, study, gaming, browsing). Broad consumer positioning: the product is not scoped to an occupation. Their job is to catch and correct bad posture as it happens, without a nagging generic alarm, and to see proof over time that habits are improving.

Secondary audience (confirmed): logged-out visitors to the marketing landing page, who must be converted to registered accounts.

## Product Purpose

Jughd (جغد, "owl") is a webcam-based posture monitoring SaaS. The user calibrates a good-posture baseline once; the app then watches their seated posture through the webcam, and when posture deviates it alerts them within seconds — naming the specific reason (neck, shoulders, or slouch) — via background-tab browser notification and optional sound. Each alert is confirmed or dismissed by the user, and that verdict plus the landmark snapshot becomes labeled training data, so the engine evolves: v1 pure geometry, v2 trained on collected data, v3 personalized per user.

Success means the habit forms inside real limits: a first calibrated session in under 3 minutes, alerts within 2 seconds of sustained deviation and always specific (zero generic "bad posture"), most alerts getting verdicts, few of them marked false alarms, free-tier usage never exceeding its allowance, and zero bytes of image/video data ever leaving the browser. The broader project goals are engineering handoff and scientific paper publication (constitution).

## Positioning

Lead claim: **every alert names its reason, and every verdict improves the model.** Neighboring posture tools nag generically; Jughd flags a specific category (neck / shoulders / slouch) and turns the user's real-or-false verdict into labeled training data that drives the model toward per-user personalization. The feedback flywheel — capture labels from day one, improve only from evidence users confirm — is the mechanism a neighbor cannot truthfully copy.

Trust floor (supporting, never the lead): all processing is on-device; only landmark coordinates leave the browser, verifiable by inspection.

## Operating Context

- Monitoring happens during ordinary desk use in a browser tab; the tab may sit in the background and alerts must still arrive (notifications). Closing the tab ends the session.
- Webcam permission and a secure context are prerequisites; denial or no camera blocks the session with a clear Persian message and no quota cost.
- Calibration is a ritual: the user sits in correct posture and triggers baseline capture (recalibrable later).
- Feedback ritual: after each alert the user marks it real or a false alarm; unconfirmed alerts persist as "unconfirmed".
- Free-tier users always see remaining monitoring time; upgrade prompts appear near the limit.
- Health content (eye-break reminders such as the 20-20-20 rule, tips, exercises) is content records each carrying a scientific citation; the product monitors posture, never presents medical diagnoses, and health copy carries a disclaimer.
- Development is spec-driven (Spec Kit artifacts under `specs/`), with granular conventional commits from inception and documentation updated alongside features — the history is publication material.

## Capabilities and Constraints

Confirmed MVP scope (feature 001):

- Account registration / sign-in / sign-out with email, username, and password (stored only as hashes); per-account data isolation.
- Calibration flow capturing landmark coordinates as a versioned good-posture baseline.
- In-browser geometric monitoring classifying deviations into neck, shoulders, and slouch; sustained-deviation alerts with category names delivered as browser notifications (background-tab capable) plus an optional, toggleable, persisted sound; per-category cooldown so alert storms don't nag.
- Per-alert verdict (real / false / unconfirmed) stored with the landmark snapshot at alert time as labeled training data for future model phases (FR-018); network failures queue and retry, never drop.
- Session records (duration, alert count, accuracy score = share of monitored time in good posture, per-alert detail), session history with drill-down.
- Dashboard: posture score trend over time, classifier accuracy (share of alerts confirmed real, with sample size — the proxy until trained models ship), tips and suggested exercises prioritized by the user's frequent alert categories, and evidence-based eye-break reminders during long sessions.
- Freemium quota: **12 cumulative monitoring hours per calendar month, resetting monthly** (confirmed); visible remaining allowance; monitoring blocked with an upgrade prompt at zero; paid tiers displayed with higher limits but the upgrade flow collects no payment in this feature.
- Public landing page with live, anonymized global aggregates and a registration call-to-action.

Hard constraints:

- **No image or video data may ever be transmitted to or stored on any server** — only landmark coordinates and metrics derived from them (Constitution I, NON-NEGOTIABLE; endpoints that would accept pixel data must not exist).
- All user-facing UI is Persian, right-to-left, with Persian numerals in copy (Persian-only for this feature).
- Memory-safe managed runtimes only (no manually managed native addons); bounded detection loop and memory budgets.
- HTTPS-only; single Linux VPS deployment via Docker; no managed cloud ML or storage services.
- Every health claim, threshold, and recommendation cites peer-reviewed literature; no medical diagnoses.
- Out of scope for this feature: password recovery, email verification, admin tooling, mobile apps, real payment processing, trained models (ML v2), per-user personalization (ML v3). This feature delivers the geometric v1 engine plus the labeled feedback pipeline those phases will consume.

Undecided (recorded, not invented): paid tier names, limits, and pricing; brand voice/tone.

## Brand Commitments

- Name: Jughd (جغد, "owl").
- Persian-first, fully RTL identity that must not look assembled from stock component-library defaults (Constitution VII).
- The implementation plan records an owl-themed identity direction as design evidence for Constitution VII (`specs/001-posture-monitoring-mvp/plan.md`) — a binding reference, recorded here without expansion.

## Evidence on Hand

- Feature artifacts: `specs/001-posture-monitoring-mvp/` — spec.md, plan.md, research.md, data-model.md, quickstart.md, contracts/api.md; constitution at `.specify/memory/constitution.md`.
- Nothing else exists yet: no code, users, sessions, data, testimonials, case studies, press, or brand assets (no logo). No real payment processing and no trained models.
- Future work must not fabricate testimonials, user counts, benchmarks, or health claims: the landing page's live global stats must render only from real aggregates, and health content ships only with genuine citations.

## Product Principles

1. Every alert names its reason — specificity is the product; generic nagging is failure, and frequency stays bounded.
2. Every verdict is training data — capture labeled feedback from day one, waste nothing collected, and let models improve only from evidence users confirm.
3. Pixels never leave the device — privacy is a verifiable engineering floor, not a marketing line.
4. Cite it or don't ship it — health guidance must be traceable to science, and the product never diagnoses.
5. Geometry first, models when proven — ship value before a dataset exists; a later phase never regresses the accuracy of the one it replaces.

## Accessibility & Inclusion

- Keyboard access, contrast, and reduced-motion behavior are verified with the UI work, not after it (Constitution quality gates); animation honors `prefers-reduced-motion`.
- Persian user-facing copy is reviewed by a Persian speaker.
- Notification permission denied falls back to in-app alerts and sound; browsers without camera or notification support get a clear message before any session attempt.
