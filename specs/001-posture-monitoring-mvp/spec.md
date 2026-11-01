# Feature Specification: Jughd Posture Monitoring MVP

**Feature Branch**: `001-posture-monitoring-mvp`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Jughd is a webcam-based posture monitoring SaaS with a Persian UI. Core: user registers with email, username, password. Session starts with webcam access granted — MediaPipe BlazePose runs in-browser detecting body landmarks. Calibration flow prompts user to sit correctly and hit calibrate, capturing landmark coordinates as their good posture baseline. During session, live landmarks are compared geometrically to baseline; bad posture triggers browser push notification (works in background tab) with specific reason (neck, shoulders, slouch) plus toggleable sound alert. User confirms each alert as real or false alarm — this feedback plus landmark snapshot is sent to server, building a labeled dataset for future model retraining. ML evolves in phases: v1 geometric math, v2 trained on collected data, v3 personalized per user. Sessions stored in PostgreSQL: duration, alert count, accuracy score, per-alert detail. Dashboard shows session history, posture score over time, classifier accuracy, tips, scientifically-backed eye break reminders after long sessions, and suggested exercises. Freemium tiers enforced (12h free, paid tiers unlock more) with upgrade prompts but no real payment yet. Marketing landing page with live global stats. Git repo initialized with commits throughout. Stack: React plus Vite frontend, Node.js backend, PostgreSQL, Docker on Linux VPS with SSH access."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Account Registration & Sign-In (Priority: P1)

A visitor creates an account with email, username, and password, and signs in
to reach their private workspace. Signed-in users can sign out; their data is
visible only to them.

**Why this priority**: Nothing else in the product works without an identity to
own baselines, sessions, and feedback. This is the entry door to every other
story.

**Independent Test**: Register a new account, sign out, sign back in with the
same credentials, and verify the workspace is private to that account. Delivers
value on its own: a secure personal workspace exists.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration form, **When** they submit a valid,
   unused email, username, and password, **Then** the account is created and
   they are signed in.
2. **Given** a registration attempt with an email or username that already
   exists, **When** they submit the form, **Then** an inline Persian error names
   the conflict and no account is created.
3. **Given** a signed-out registered user, **When** they sign in with correct
   credentials, **Then** they reach their workspace with their own data.
4. **Given** wrong sign-in credentials, **When** they submit the form, **Then**
   a generic error is shown and no session is opened.

---

### User Story 2 - Calibrated Monitoring Session with Posture Alerts (Priority: P1)

A signed-in user grants webcam access, sits in correct posture, and presses
calibrate to capture their good-posture baseline as landmark coordinates. The
system then monitors them, compares live landmarks to the baseline
geometrically, and alerts them — with the specific reason (neck, shoulders, or
slouch) — via browser notification (works with the tab in the background) and
an optional sound.

**Why this priority**: This is the core product value: catching bad posture as
it happens. Without it there is nothing to record, confirm, or learn from.

**Independent Test**: Start a session, calibrate, then deliberately lean into
bad neck posture; verify an alert fires naming the neck within seconds, also
when the tab is in the background.

**Acceptance Scenarios**:

1. **Given** a signed-in user with remaining free quota, **When** they grant
   webcam access and start a session, **Then** the calibration prompt appears.
2. **Given** the calibration screen with a person detected, **When** the user
   sits in correct posture and presses calibrate, **Then** their baseline is
   captured and monitoring begins.
3. **Given** active monitoring, **When** neck position deviates from the
   baseline for a sustained period, **Then** an alert fires naming the neck as
   the reason, delivered as a browser notification even while the tab is in the
   background.
4. **Given** active monitoring, **When** shoulder position or overall slouch
   deviates, **Then** the alert names that specific category, not a generic
   "bad posture".
5. **Given** sound alerts enabled, **When** the user toggles sound off, **Then**
   alerts continue silently as notifications and the preference is remembered.

---

### User Story 3 - Alert Confirmation as Labeled Feedback (Priority: P1)

After each alert, the user marks it as a real problem or a false alarm. The
verdict and the landmark coordinates captured at alert time are sent to the
server, building a labeled dataset for future model retraining.

**Why this priority**: This feedback is the raw material for every later ML
phase; capturing it from day one means the dataset grows with usage and no
collected data is ever wasted.

**Independent Test**: Trigger two alerts, mark one real and one false; verify
both verdicts with their landmark snapshots appear in the stored session
detail.

**Acceptance Scenarios**:

1. **Given** an alert fired, **When** the user marks it as real, **Then** the
   verdict and the landmark snapshot at alert time are stored as a positive
   label.
2. **Given** an alert fired, **When** the user marks it as a false alarm, **Then**
   the verdict and landmark snapshot are stored as a negative label.
3. **Given** an alert the user never confirms, **When** the session ends, **Then**
   the alert is stored with an "unconfirmed" state rather than discarded.
4. **Given** the network is unavailable, **When** a verdict is submitted, **Then**
   it is queued locally and sent when connectivity returns, and never lost.

---

### User Story 4 - Session History & Summaries (Priority: P2)

After each session the user sees it in their history with duration, alert
count, and posture score, and can open it to review every alert with its
category and their verdict.

**Why this priority**: Users need proof the product works on them over time;
history turns single sessions into an accountable record.

**Independent Test**: Complete a session with two alerts and one verdict, then
open history and verify the session row and its per-alert detail are complete.

**Acceptance Scenarios**:

1. **Given** one or more completed sessions, **When** the user opens their
   session history, **Then** each session lists duration, alert count, and
   posture score.
2. **Given** a session in history, **When** the user opens its detail, **Then**
   every alert shows its time, category, landmark snapshot summary, and verdict
   state.
3. **Given** a session that ends (by user or quota), **When** the session
   closes, **Then** its summary is computed and appears in history.

---

### User Story 5 - Dashboard Insights & Wellness Guidance (Priority: P2)

The dashboard shows posture score over time, classifier accuracy, posture tips,
evidence-based eye-break reminders during long sessions, and suggested
exercises tuned to the user's most frequent problem areas.

**Why this priority**: Insights and guidance convert raw sessions into
improvement, which drives retention — but they depend on data from stories 2–4.

**Independent Test**: With several stored sessions, open the dashboard and
verify the score trend renders, classifier accuracy reflects verdicts, and
tips and exercises are shown with sources.

**Acceptance Scenarios**:

1. **Given** multiple completed sessions, **When** the user opens the
   dashboard, **Then** their posture score trend over time is displayed.
2. **Given** alerts with verdicts, **When** the user views classifier accuracy,
   **Then** the share of alerts confirmed real is shown together with the
   number of verdicts it is based on.
3. **Given** a long continuous session, **When** it passes the evidence-based
   screen-time threshold, **Then** an eye-break reminder appears with a brief
   cited rationale.
4. **Given** a user whose alerts are mostly neck-related, **When** they view
   tips and suggested exercises, **Then** neck-focused guidance is prioritized,
   each item evidence-based and traceable to a scientific source.

---

### User Story 6 - Freemium Quota & Upgrade Prompts (Priority: P2)

Free users get a monitoring allowance with a visible remaining-quota meter.
When the allowance runs low or out, the product prompts an upgrade showing the
paid tiers. No real payment happens in this version.

**Why this priority**: The business model must be enforced from launch so usage
habits form around real limits, but it does not block the core monitoring loop.

**Independent Test**: Use a free account down to its limit and verify quota
visibility, upgrade prompts, and that monitoring is blocked at zero.

**Acceptance Scenarios**:

1. **Given** a free-tier user, **When** they view their workspace, **Then**
   remaining monitoring time out of their 12-hour monthly allowance is visible.
2. **Given** a free user near or at the allowance limit, **When** they start or
   continue a session, **Then** an upgrade prompt shows the paid tier options
   without collecting payment.
3. **Given** an exhausted allowance, **When** they attempt a new session, **Then**
   monitoring is blocked with an upgrade prompt and their existing data remains
   fully accessible.

---

### User Story 7 - Marketing Landing Page with Live Global Stats (Priority: P3)

Logged-out visitors see a marketing landing page presenting the product with
live, anonymized global statistics (such as total users, sessions, and alerts
flagged) and a clear call to register.

**Why this priority**: Acquisition surface for the whole product; it adds no
functionality to the monitoring loop itself.

**Independent Test**: Open the landing page signed out and verify the stats
render from real aggregates and the registration call-to-action works.

**Acceptance Scenarios**:

1. **Given** a logged-out visitor, **When** they open the landing page, **Then**
   the product pitch, live anonymized global stats, and registration
   call-to-action are displayed.
2. **Given** new sessions complete on the platform, **When** stats refresh,
   **Then** the global totals reflect the new activity.

---

### Edge Cases

- Webcam permission denied or no camera available: clear Persian error, no
  session starts, quota untouched.
- No person detected or user leaves the frame: monitoring shows a paused state;
  paused time counts toward neither posture score nor quota.
- Calibration attempted without a person detected: blocked with a prompt to
  reposition.
- Multiple people in frame: the primary (largest) detected person is monitored.
- Browser notification permission denied: in-app alerts and sound remain the
  fallback.
- Alert storm (rapid posture oscillation): after an alert in a category, that
  category re-alerts only after posture recovers or a cooldown passes.
- Quota exhausted mid-session: session ends with its summary preserved and an
  upgrade prompt is shown.
- Session started with less remaining quota than a full session: user is warned
  of remaining time before monitoring begins.
- Network failure while sending feedback or session data: updates are queued
  locally, retried, and never silently dropped.
- Browser without camera or notification support: clear unsupported-browser
  message before any session attempt.
- Session with zero alerts: posture score reflects the full session as good
  posture time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow account registration and sign-in with email,
  username, and password, enforce uniqueness of email and username, store
  passwords only as hashes, and support sign-out.
- **FR-002**: All webcam processing MUST happen on the user's device. No image
  or video data may be transmitted to or stored on any server — only landmark
  coordinates and metrics derived from them.
- **FR-003**: System MUST provide a calibration flow that prompts the user to
  sit correctly, captures their landmark coordinates as a good-posture baseline
  when they trigger calibration, and allows recalibration later.
- **FR-004**: During a session, system MUST compare live landmarks to the
  user's baseline geometrically and classify deviations into at least three
  categories: neck, shoulders, and slouch. Deviation thresholds MUST be
  grounded in cited literature — forward-head angle: Hansraj KK (Surg Technol
  Int, 2014); shoulders and slouch: NIOSH ergonomics guidelines — with
  derivations documented in research.md §2 (Constitution III).
- **FR-005**: On sustained deviation, system MUST raise an alert naming the
  specific category, delivered as a browser notification that reaches the user
  while the app tab is in the background, plus an optional sound alert whose
  state is user-toggleable and persisted.
- **FR-006**: System MUST bound alert frequency: a category re-alerts only
  after posture recovers or a cooldown elapses.
- **FR-007**: System MUST let the user confirm each alert as real or a false
  alarm, and MUST persist each verdict together with the landmark coordinates
  captured at alert time as labeled training data; unconfirmed alerts are
  persisted with an unconfirmed state.
- **FR-008**: System MUST persist each session with duration, alert count,
  posture score (share of monitored time in good posture), and per-alert
  detail (time, category, landmark snapshot, verdict state).
- **FR-009**: System MUST show the user a session history with per-session
  summary and drill-down to per-alert detail.
- **FR-010**: System MUST show posture score trend over time across the user's
  sessions.
- **FR-011**: System MUST show classifier accuracy — the share of alerts users
  confirm as real, with its sample size — as the accuracy measure until trained
  models ship.
- **FR-012**: During long continuous sessions, system MUST show eye-break
  reminders at evidence-based intervals, each with a brief rationale traceable
  to scientific sources.
- **FR-013**: System MUST offer posture tips and suggested exercises that are
  evidence-based, traceable to scientific sources, and prioritized by the
  user's most frequent alert categories.
- **FR-014**: System MUST enforce the free tier at 12 hours of monitoring per
  calendar month, show remaining allowance, block monitoring with an upgrade
  prompt when exhausted, and present paid tiers with higher limits whose
  upgrade flow collects no payment in this feature.
- **FR-015**: System MUST provide a public landing page showing live global
  aggregate statistics (anonymized totals only) and a registration
  call-to-action, exposing no individual user data.
- **FR-016**: All user-facing UI MUST be Persian, right-to-left, and use
  Persian numerals in copy.
- **FR-017**: System MUST isolate user data: accounts, baselines, sessions,
  alerts, and feedback are visible only to their owner.
- **FR-018**: Feedback data MUST be structured so future model training (on
  collected data) and per-user personalization can consume it without new data
  collection.

### Key Entities *(include if feature involves data)*

- **User Account**: identity and credentials — email, username, password hash,
  tier, creation date. Owns everything below.
- **Posture Baseline**: landmark coordinates of the user's good seated posture,
  captured at calibration, versioned by calibration time.
- **Monitoring Session**: one monitoring period — start/end times, duration,
  alert count, posture score.
- **Posture Alert**: one flagged deviation — time, category (neck/shoulders/
  slouch), landmark snapshot at alert time, verdict (real/false/unconfirmed).
- **Usage Quota**: monitoring time used against the tier allowance for the
  current period.
- **Global Aggregate**: anonymized platform totals (users, sessions, monitoring
  hours, alerts) for the landing page, derived from the above.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user completes registration and their first calibrated
  monitoring session in under 3 minutes.
- **SC-002**: Alerts reach the user within 2 seconds after the sustain threshold
  is met (deviation held for T_sustain), including when the app tab is in the
  background.
- **SC-003**: Every alert names a specific reason (neck, shoulders, or slouch) —
  zero generic "bad posture" alerts.
- **SC-004**: Fewer than 20% of confirmed alerts are marked false alarms,
  measured from user verdicts.
- **SC-005**: Free-tier monitoring never exceeds the 12-hour monthly allowance;
  overages are zero.
- **SC-006**: A dashboard with 3 months of session history renders within 2
  seconds.
- **SC-007**: 100% of health-related content (break reminders, exercises,
  tips) carries an accessible scientific reference.
- **SC-008**: Zero bytes of image or video data are transmitted to or stored on
  any server, verifiable by inspection of all stored and transmitted data.
- **SC-009**: At least 60% of alerts receive a user verdict within 24 hours.
- **SC-010**: Session posture scores match a manual recount of good/bad
  periods within 5 percentage points on sampled sessions.

## Assumptions

- Free allowance is 12 cumulative monitoring hours per calendar month, resetting
  monthly; paid tiers raise or remove the cap. *(Most worth confirming — the
  input said "12h free" without a window; a lifetime trial cap would change
  quota messaging and reset behavior.)*
- Paid tiers are displayed as plans and the upgrade flow is a placeholder: no
  payment processing, no charges, in this feature.
- "Landmark snapshot" means body keypoint coordinates at alert time — never an
  image or frame.
- Browser notifications require user permission; if denied, in-app alerts and
  sound remain. Sound is toggleable and may require an initial user gesture
  before it can play.
- Monitoring runs while the app tab is open (foreground or background);
  closing the tab ends the session. Alerts in background tabs do not require
  the tab to be focused.
- Posture score is the share of monitored (non-paused) time with posture
  within baseline thresholds; paused time is excluded.
- "Classifier accuracy" on the dashboard is the share of alerts confirmed real
  (a proxy) until trained models ship in a later phase.
- Eye-break reminders follow established screen-time guidelines (e.g., the
  20-20-20 rule) with citations, triggered after a guideline-defined period of
  continuous session time.
- When multiple people are in frame, the largest detected person is monitored.
- UI is Persian-only for this feature.
- Scope boundaries: password recovery, email verification, admin tooling,
  mobile apps, real payment processing, trained models (ML phase v2) and
  per-user personalization (phase v3) are out of scope. This feature delivers
  the geometric (v1) engine plus the labeled feedback pipeline those phases
  will consume.
- Deployment and stack constraints are pre-given: React + Vite frontend,
  Node.js backend, PostgreSQL, Docker on a Linux VPS with SSH access, and
  MediaPipe BlazePose for in-browser landmark detection. Requirements above are
  written to accept any comparable in-browser pose model with full body
  keypoint coverage.
