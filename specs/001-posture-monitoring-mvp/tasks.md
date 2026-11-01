# Tasks: Jughd Posture Monitoring MVP

**Input**: Design documents from `/specs/001-posture-monitoring-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Targeted test tasks included where the constitution mandates them
(non-trivial geometry, privacy invariants, trust-boundary validation). Full TDD
is not requested.

**Organization**: Tasks are grouped by user story for independent implementation
and testing. Paths follow plan.md: `web/` (React + Vite SPA) and `api/`
(Express + Prisma).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other `[P]` tasks in the same phase
  (different files; prerequisites in earlier phases)
- **[Story]**: User story label (US1–US7), user-story phases only
- Every task names exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create repository layout per plan.md Project Structure: `web/`, `api/`, `docker-compose.yml`, `Caddyfile`, `.env.example`, root `.gitignore`
- [X] T002 [P] Scaffold web app (Vite + React 19 + TypeScript + Vitest) in `web/`: `web/package.json`, `web/vite.config.ts` (dev proxy `/api` → api service), `web/tsconfig.json`, `web/index.html` (`lang="fa" dir="rtl"`), `web/src/main.tsx`
- [X] T003 [P] Scaffold api app (Node 22 + Express + TypeScript + zod + Vitest + supertest) in `api/`: `api/package.json`, `api/tsconfig.json`, `api/src/app.ts`, `api/tests/`
- [X] T004 [P] Docker Compose dev + prod profiles in `docker-compose.yml` (pinned `postgres:16-alpine`, api, web, caddy services) + TLS reverse proxy in `Caddyfile` (webcam requires HTTPS — research.md §9)
- [X] T005 [P] Prisma tooling in `api/prisma/schema.prisma` (datasource + generator) and Prisma client singleton `api/src/lib/prisma.ts`; add `DATABASE_URL`, `SESSION_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` to `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Define all six Prisma models + generate migration in `api/prisma/schema.prisma` + `api/prisma/migrations/`, per data-model.md constraints verbatim: **User** (email citext "unique, valid format, ≤254 chars"; username "unique, 3–32 chars, `[a-z0-9_]+`"; passwordHash "never exposed via API"; tier enum `FREE|PRO` default `FREE`), **Baseline** (landmarks "33×{x,y,z,score} — numbers only; score ∈ [0,1]"; "current baseline = latest per user"), **MonitoringSession** (status enum `ACTIVE|COMPLETED|QUOTA_EXHAUSTED`; durationSec "≥0"; postureScore "0–100"; baselineId FK), **PostureAlert** (clientKey "uuid unique — idempotency key"; category enum `NECK|SHOULDER|SLOUCH`; landmarksSnapshot "numbers only"; verdict enum `UNCONFIRMED|REAL|FALSE` default `UNCONFIRMED`), **AuthSession** ("token hash stored, raw id rides in the `sid` cookie"; "sliding expiry, absolute cap"), **PushSubscription** (endpoint unique, p256dh, auth); indexes per data-model.md: `MonitoringSession(userId, startedAt)`, `Alert(sessionId)`, `Alert(userId)`, `Alert(clientKey)` unique, `AuthSession(userId)`, `PushSubscription(userId)`
- [X] T007 [P] Zod validation schemas for all API payloads in `api/src/lib/validation.ts` per data-model.md trust-boundary rules: landmarks arrays "of finite numbers only", "0 ≤ durationSec ≤ elapsed wall time + 5%", "0 ≤ postureScore ≤ 100", verdict/category enums, email/username/password rules
- [X] T008 [P] Express app shell in `api/src/app.ts` + `api/src/lib/errors.ts`: error envelope `{"error": {"code", "message"}}` per contracts/api.md, zod error mapping, 404/500 handlers, helmet security headers, JSON body limit, ops `/healthz`
- [X] T009 [P] Env config loader `api/src/lib/config.ts`: DATABASE_URL, SESSION_SECRET, VAPID keys, `FREE_MONTHLY_SECONDS` (default 43200 = 12h), fail-fast on missing/invalid values
- [X] T010 [P] Typed API client `web/src/lib/api.ts`: fetch wrapper with credentials, error-envelope parsing to code enum, TS types mirroring contracts/api.md
- [X] T011 [P] Design-system foundation in `web/src/design/`: CSS custom-property tokens (owl-themed night-indigo + amber palette, Vazirmatn font stack), RTL logical-property primitives, Persian numeral helper, `prefers-reduced-motion` gate utility, owl mascot SVG (plan.md §8, constitution VII)
- [X] T012 [P] Web app shell in `web/src/app/`: router (landing/auth/monitor/dashboard), providers, root `dir="rtl"`, error boundary

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Account Registration & Sign-In (Priority: P1) 🎯

**Goal**: Accounts with hashed passwords and revocable cookie sessions; the
identity that owns everything else.

**Independent Test**: quickstart V1 — register with email/username/password,
sign out, sign back in; duplicate email/username shows Persian inline error;
wrong credentials show a generic error.

### Implementation for User Story 1

- [X] T013 [P] [US1] Password hashing/verification with `node:crypto` scrypt (N=2^15, r=8, p=1, 16-byte salt, params stored with hash) in `api/src/lib/password.ts` + unit test `api/tests/password.test.ts` (constitution II: no native addons)
- [X] T014 [P] [US1] Auth session service `api/src/services/auth-service.ts` + `requireAuth` middleware `api/src/lib/session.ts`: create/revoke/verify AuthSession rows; `sid` cookie (httpOnly, SameSite=Lax, Secure in prod); "sliding expiry, absolute cap"
- [X] T015 [US1] Auth routes `api/src/routes/auth.ts` per contracts/api.md: `POST /auth/register` → 201 `{user}`, 409 `EMAIL_TAKEN`/`USERNAME_TAKEN`; `POST /auth/login` → 200, 401 `INVALID_CREDENTIALS` (generic), rate-limited per IP + account; `POST /auth/logout` → 204; `GET /auth/me` → 200 `{user, quota}` (depends: T013, T014)
- [X] T016 [P] [US1] Contract tests `api/tests/auth.test.ts`: register/login/logout/me, duplicate conflicts, generic 401, rate limit, responses never contain `passwordHash` ("never exposed via API"), cookie flags
- [X] T017 [P] [US1] Register + login pages `web/src/features/auth/`: Persian RTL forms, inline validation, error-code → Persian messages (built against contracts/api.md)
- [X] T018 [US1] Auth state bootstrap `web/src/features/auth/auth-context.tsx` + protected-route wrapper in `web/src/app/`: `GET /auth/me` on load, redirect unauthenticated users, sign-out action (depends: T015, T017)

**Checkpoint**: quickstart V1 passes — auth story fully functional

---

## Phase 4: User Story 2 — Calibrated Monitoring with Posture Alerts (Priority: P1) 🎯

**Goal**: Calibration → in-browser detection → categorized alerts (neck,
shoulders, slouch) via service-worker notifications and optional sound, working
in background tabs.

**Independent Test**: quickstart V2–V4 — calibrate with person detected; hold
forward-head posture >3s → alert naming **neck** within 2s of sustained
deviation; hide the tab → notification still appears; slouch/shoulders alerts
name their specific category.

### Implementation for User Story 2

- [X] T019 [US2] Baseline + session services and routes: `api/src/services/baseline-service.ts`, `api/src/services/session-service.ts`, `api/src/routes/baselines.ts`, `api/src/routes/sessions.ts` — `POST /baselines` ("current baseline = latest per user"), `GET /baselines/current` (404 `NO_BASELINE`), `POST /sessions` (ACTIVE; quota gate arrives in US6), `PATCH /sessions/:id/end` with clamping per data-model.md (depends: T006, T007, T014)
- [X] T020 [P] [US2] Pose worker `web/src/engine/pose-worker.ts` + `web/src/engine/pose.ts`: `@mediapipe/tasks-vision` PoseLandmarker (BlazePose GHUM, 33 landmarks) in a Web Worker, frames via `createImageBitmap(video)`, 20 fps cap, fixed-size buffers, deterministic disposal (research.md §1/§4); person selection — when multiple people are detected, monitor the largest detected person by bounding box area (spec edge cases)
- [X] T021 [US2] Geometry engine `web/src/engine/geometry.ts` + alert manager `web/src/engine/alert-manager.ts`: torso normalization (shoulder–hip scale); category signals NECK (ear–shoulder vertical offset, head-forward angle), SHOULDER (shoulder-line tilt, ear–shoulder shortening), SLOUCH (trunk lean) vs baseline; state machine with `θ_low = 0.7·θ_high` hysteresis, `T_sustain` 3s, `T_cooldown` 60s (FR-006); session timeline → posture score = share of monitored time in good posture; emits engine events per contracts/api.md (depends: T020)
- [X] T022 [P] [US2] Geometry + alert state-machine unit tests `web/tests/geometry.test.ts`: hysteresis enter/exit, sustain-before-alert, cooldown/recovery re-alert, category classification fixtures, posture-score math (constitution workflow gate: non-trivial geometry ships with tests)
- [X] T023 [US2] Calibration flow `web/src/features/monitor/calibration.tsx`: browser support check on load (webcam + notification API) showing a clear Persian error message on unsupported browsers before any session attempt (spec edge cases); correct-sitting prompt, person-detected gate (block calibration without a person — spec edge cases), calibrate → `POST /baselines`, monitoring start, recalibration entry (depends: T019, T021)
- [X] T024 [US2] Live session UI `web/src/features/monitor/session.tsx`: camera preview + landmark overlay, posture state indicator, no-person → paused state ("paused time counts toward neither posture score nor quota"), persisted sound toggle (depends: T021, T023)
- [X] T025 [P] [US2] Service worker `web/public/sw.js` + notification helper `web/src/lib/notify.ts`: `show-notification` message → notification with category-specific Persian reason, `notificationclick` → focus/open app (contracts/api.md client-side contracts)
- [X] T026 [P] [US2] Background keepalive `web/src/lib/keepalive.ts`: silent Web Audio (gain 0) started on `document.hidden` to preserve timer cadence (research.md §4); graceful "background monitoring may be delayed" hint if throttled
- [X] T027 [US2] Alert delivery integration `web/src/lib/notify.ts` + `web/src/features/monitor/session.tsx`: engine alert → SW notification + optional sound (user-gesture gate for audio), sound toggle wiring (depends: T021, T025)
- [X] T028 [P] [US2] Web Push plumbing `api/src/routes/push.ts` + `api/src/lib/push.ts` (VAPID `web-push` sender; `POST/DELETE /push/subscribe` per contracts/api.md) and browser subscription in `web/src/lib/notify.ts`
- [X] T029 [P] [US2] API tests `api/tests/sessions.test.ts`: baseline current = latest, end-session clamping ("0 ≤ durationSec ≤ elapsed wall time + 5%", "0 ≤ postureScore ≤ 100"), owner isolation 404
- [X] T030 [US2] Session finalization on tab close + stale sweep: `web/src/lib/session-finalize.ts` (`navigator.sendBeacon` on `beforeunload` → `PATCH /sessions/:id/end`) wired in `web/src/features/monitor/session.tsx`, plus a server-side sweep in `api/src/services/session-service.ts` (interval-started in `api/src/app.ts`) marking sessions stuck `ACTIVE` >2h as `COMPLETED` with clamped `durationSec` so quota accounting never undercounts (SC-005 depends on this; depends: T019, T024)

**Checkpoint**: quickstart V2–V4 pass — monitoring and alerts work standalone

---

## Phase 5: User Story 3 — Alert Confirmation as Labeled Feedback (Priority: P1)

**Goal**: Real/false verdicts + landmark snapshots persisted as a labeled
dataset; verdicts survive network loss.

**Independent Test**: quickstart V5 — mark one alert real, one false; kill the
network, mark a third, reconnect; all verdicts with landmark snapshots
persisted, unconfirmed alerts stored at session end.

### Implementation for User Story 3

- [X] T031 [US3] Feedback endpoints `api/src/routes/alerts.ts` + `api/src/services/feedback-service.ts`: `POST /sessions/:id/alerts` idempotent batch upsert keyed on unique `clientKey`, `PATCH /alerts/:id/verdict` with 409 `ALREADY_VERIFIED` on conflicting repeat (contracts/api.md; depends: T019)
- [X] T032 [P] [US3] Feedback API tests `api/tests/alerts.test.ts`: idempotent replay returns same ids, terminal verdict transitions, owner isolation, `landmarksSnapshot` rejected unless finite numbers (privacy invariant)
- [X] T033 [P] [US3] Client outbox `web/src/lib/outbox.ts`: localStorage queue keyed by client-generated UUIDs, flush on interval + session end + `online` event, exponential backoff (research.md §10)
- [X] T034 [P] [US3] Feedback UI `web/src/features/monitor/feedback.tsx`: real/false buttons on alert cards, verdict state display, unconfirmed alerts visible
- [X] T035 [US3] Pipeline wiring `web/src/features/monitor/`: engine alert events → outbox → `POST /sessions/:id/alerts`; verdict → `PATCH /alerts/:id/verdict` (depends: T031, T033, T034)

**Checkpoint**: quickstart V5 passes — labeled dataset flows end-to-end

---

## Phase 6: User Story 4 — Session History & Summaries (Priority: P2)

**Goal**: History list with per-session summaries and per-alert detail.

**Independent Test**: quickstart V6 (history part) — completed session appears
with duration, alert count, posture score; detail lists every alert with
category, time, snapshot summary, verdict.

### Implementation for User Story 4

- [ ] T036 [US4] Session read endpoints in `api/src/routes/sessions.ts` + `api/src/services/session-query.ts`: `GET /sessions` (cursor pagination, newest first), `GET /sessions/:id` with alerts ("404 otherwise" for non-owner) (depends: T031)
- [ ] T037 [P] [US4] Read API tests `api/tests/sessions-read.test.ts`: pagination cursors, detail includes alert `verdict`/`landmarksSnapshot` fields, non-owner 404
- [ ] T038 [US4] History UI `web/src/features/dashboard/history.tsx`: session list (duration, alert count, posture score), drill-in alert cards (depends: T036, T034)

**Checkpoint**: quickstart V6 history checks pass

---

## Phase 7: User Story 5 — Dashboard Insights & Wellness Guidance (Priority: P2)

**Goal**: Posture-score trend, classifier accuracy with sample size, cited tips
and exercises, evidence-based eye-break reminders.

**Independent Test**: quickstart V6–V7 — trend renders over multiple sessions;
classifier accuracy shows share-real + verdict count; 20-minute session triggers
eye-break with cited rationale; exercises prioritize the user's top alert
category; every item shows a source.

### Implementation for User Story 5

- [ ] T039 [P] [US5] Dashboard summary endpoint `api/src/routes/dashboard.ts` + `api/src/services/aggregate-service.ts`: `GET /dashboard/summary` — daily posture-score trend, `alertAccuracy {real, confirmed, rate}` ("rate null when confirmed = 0"), recentSessions (contracts/api.md)
- [ ] T040 [P] [US5] Summary API tests `api/tests/dashboard.test.ts`: day bucketing, rate math including the null case, user isolation
- [ ] T041 [P] [US5] Wellness content `web/src/content/`: tips + exercises per category (NECK/SHOULDER/SLOUCH/GENERAL) + eye-break rule (20-20-20 at 20-min intervals), every record carrying REQUIRED `citation {source, reference, url}` (constitution III) + completeness test `web/tests/content.test.ts` extended with threshold citation verification — every posture-threshold config entry cites its source (Hansraj 2014 / NIOSH per research.md §2)
- [ ] T042 [US5] Eye-break scheduler `web/src/features/monitor/eye-break.tsx`: 20-min continuous-session timer, cited rationale in the reminder, dismiss/snooze (depends: T024, T041)
- [ ] T043 [US5] Insights UI `web/src/features/dashboard/insights.tsx`: posture-score trend chart, classifier accuracy with sample size, tips + exercises ranked by the user's alert-category mix (depends: T039, T041, T038)

**Checkpoint**: quickstart V6–V7 dashboard checks pass

---

## Phase 8: User Story 6 — Freemium Quota & Upgrade Prompts (Priority: P2)

**Goal**: 12 monitoring hours/month free, visible meter, upgrade prompts; no
payment processing.

**Independent Test**: quickstart V8 — quota meter counts monitored time; at zero
remaining, new sessions blocked with upgrade prompt showing paid tiers; existing
data stays fully accessible.

### Implementation for User Story 6

- [ ] T044 [P] [US6] Quota service `api/src/services/quota-service.ts` + routes `api/src/routes/quota.ts`: derived `SUM(durationSec)` per calendar month vs `FREE_MONTHLY_SECONDS` (12h = 43,200s), `GET /quota` per contract, gate in `POST /sessions` → code `QUOTA_EXHAUSTED`, mid-session exhaustion ends session `QUOTA_EXHAUSTED` with summary preserved (spec edge cases; depends: T019)
- [ ] T045 [P] [US6] Quota API tests `api/tests/quota.test.ts`: month-boundary sums, gate at zero remaining, partial-month usage, tier limit config
- [ ] T046 [US6] Quota UI `web/src/features/dashboard/quota.tsx` + monitor integration: remaining-time meter, near-limit warning (server push via T028 sender), upgrade prompt with paid tier cards ("no real payment"), `QUOTA_EXHAUSTED` session-end handling (depends: T044, T038)

**Checkpoint**: quickstart V8 passes

---

## Phase 9: User Story 7 — Marketing Landing Page with Live Global Stats (Priority: P3)

**Goal**: Public Persian landing page with live anonymized platform totals and a
register CTA.

**Independent Test**: quickstart V9 — signed-out page shows global totals that
move as sessions complete elsewhere; no individual data visible.

### Implementation for User Story 7

- [ ] T047 [P] [US7] Global stats endpoint `api/src/routes/stats.ts` (+ aggregate reuse in `api/src/services/aggregate-service.ts`): `GET /stats/global` → `{users, sessions, monitoredHours, alerts}`, "anonymized totals only", 60s in-memory cache + tests `api/tests/stats.test.ts` (depends: T006)
- [ ] T048 [P] [US7] Landing page `web/src/features/landing/`: owl-branded hero, marketing pitch in Persian, register CTA, built against contracts/api.md
- [ ] T049 [US7] Landing stats wiring `web/src/features/landing/stats.tsx`: poll `GET /stats/global`, Persian numeral formatting, live refresh (depends: T047, T048)

**Checkpoint**: quickstart V9 passes

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Accessibility + RTL polish pass `web/src/`: keyboard navigation, focus states, contrast, `prefers-reduced-motion` verification across all pages (constitution VII)
- [ ] T051 [P] Persian copy review `web/src/`: all user-facing strings Persian with Persian numerals; every error code from contracts/api.md mapped to Persian messages
- [ ] T052 [P] Privacy invariant audit `api/tests/privacy.test.ts` + `api/prisma/schema.prisma`: every route rejects non-numeric landmark payloads; assert zero binary/blob columns exist (constitution I gate, SC-008)
- [ ] T053 [P] Performance pass `web/src/engine/` + `web/`: detection loop profiling (20 fps cap, worker isolation), bundle analysis, route-level code splitting for landing/dashboard
- [ ] T054 [P] Documentation `README.md` + `docs/architecture.md`: setup/dev/deploy, data flow including the landmark-only path, citations appendix for wellness content (constitution VI)
- [ ] T055 Prod deployment verification: `docker compose --profile prod up -d --build`, `prisma migrate deploy`, Caddy TLS smoke per quickstart.md deploy section
- [ ] T056 Run quickstart.md validation V1–V10 end-to-end and record results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: After Foundational — gates all authenticated stories
- **US2 (Phase 4)**: After US1 (needs `requireAuth`) — gates US3/US4/US5
- **US3 (Phase 5)**: After US2 (alerts exist client-side)
- **US4 (Phase 6)**: After US3 (reads persisted alerts)
- **US5 (Phase 7)**: After US4 (aggregates over sessions/alerts); content (T041) can start right after Foundational
- **US6 (Phase 8)**: After US2 (enforces limits on session creation)
- **US7 (Phase 9)**: After Foundational — parallel-safe with US4–US6 (public endpoint + page)
- **Polish (Phase 10)**: After all desired stories

### User Story Dependencies

- **US1 (P1)**: No story dependencies — first story
- **US2 (P1)**: US1 (auth); independently testable via V2–V4
- **US3 (P1)**: US2 (alert events); independently testable via V5
- **US4 (P2)**: US3 (stored alerts); independently testable with seeded data
- **US5 (P2)**: US4 (session/alert data); content module T041 is story-independent
- **US6 (P2)**: US2 (session lifecycle); quota math testable with seeded sessions
- **US7 (P3)**: None beyond Foundational — aggregates over seeded data

### Within Each User Story

- Services before routes; routes before UI that calls them
- Test tasks (marked [P]) are authored against contracts/api.md and run against
  the paired implementation (constitution: logic "ships with tests")
- Core implementation before integration wiring tasks

### Parallel Opportunities

- Setup: T002–T005 after T001
- Foundational: T007–T012 after T006
- US1: {T013, T014} ∥ {T017}; tests T016 with implementation
- US2: {T020, T025, T026, T028} in parallel; T022/T029 tests with implementation
- US3: {T032, T033, T034} after T031
- US4: T037 with T036
- US5: {T039, T040, T041} in parallel (T041 story-independent)
- US6: {T044, T045} in parallel
- US7: {T047, T048} in parallel — and the whole story parallel to US4–US6
- Polish: T050–T054 all parallel

---

## Parallel Example: User Story 2

```bash
# Launch the independent engine/infra tasks together:
Task: "Pose worker in web/src/engine/pose-worker.ts + web/src/engine/pose.ts"           # T020
Task: "Service worker web/public/sw.js + web/src/lib/notify.ts"                          # T025
Task: "Background keepalive web/src/lib/keepalive.ts"                                    # T026
Task: "Web Push plumbing api/src/routes/push.ts + api/src/lib/push.ts"                   # T028

# Then the sequential core: T021 geometry engine → T023 calibration →
# T024 session UI → T027 alert delivery → T030 session finalization,
# with T022/T029 tests alongside.
```

## Parallel Example: User Story 5

```bash
Task: "Dashboard summary endpoint api/src/routes/dashboard.ts"        # T039
Task: "Summary API tests api/tests/dashboard.test.ts"                 # T040
Task: "Wellness content web/src/content/ + web/tests/content.test.ts" # T041
# Then T042 eye-break scheduler → T043 insights UI
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 Setup + Phase 2 Foundational
2. Phase 3 US1 (auth) → validate quickstart V1
3. Phase 4 US2 (monitoring + alerts) → validate quickstart V2–V4
4. **STOP and VALIDATE**: a registered user can calibrate and receive correct
   categorized alerts in foreground and background tabs — the demo-able core.
   (US1 alone is not a product; US1+US2 is the smallest demo that delivers the
   product's promise. US3 immediately follows to complete the P1 set.)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1+US2 → V1–V4 → first demo (MVP)
3. US3 → V5 → labeled dataset flowing (P1 complete)
4. US4 → V6 → history value
5. US5 → V7 → retention value
6. US6 → V8 → business model enforced
7. US7 → V9 → acquisition surface (parallel with US4–US6 if staffed)
8. Polish + V10 → release

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 → US2 (critical path); Developer B: US7 + wellness content
   (T041); Developer C: picks up US4/US6 once US3 lands
3. Stories integrate through contracts/api.md and finish independently

---

## Notes

- [P] tasks touch different files with prerequisites in earlier phases
- [Story] labels map tasks to spec.md user stories for traceability
- Commit after each task or logical group (constitution V: granular conventional
  commits)
- Stop at any checkpoint to validate the story independently (quickstart.md)
- Alerts' `landmarksSnapshot`, `durationSec`, and `postureScore` are
  client-reported by design (server never sees frames) and clamped server-side —
  see data-model.md validation rules
