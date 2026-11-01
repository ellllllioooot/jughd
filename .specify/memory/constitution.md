# Jughd (جغد / Owl) Constitution

## Core Principles

### I. Privacy-First, On-Device Processing (NON-NEGOTIABLE)

All webcam and video processing MUST run on-device in the user's browser. No video
or image frame — captured, intermediate, or derived — may be stored, transmitted, or
persisted by any part of the system. The only visually derived data that may leave the
processing pipeline is landmark coordinates (keypoint vectors) and metrics computed
from them.

Rationale: posture analysis needs skeletal geometry, not pixels. Keeping frames on
device is the foundation of user trust and removes whole classes of breach and
compliance risk.

### II. Memory Safety & Resource Efficiency

Backend and ML code MUST run in memory-safe managed runtimes: Node.js for
services, browser-side memory-safe models — MediaPipe BlazePose or TensorFlow.js —
for model inference and training. Native addons that require manual
memory management are prohibited. TensorFlow.js tensors MUST be disposed (`tf.tidy`
or explicit `dispose`); no tensor may survive its inference frame. Inference loops
MUST run at bounded frame rate and resolution, and memory and CPU usage MUST stay
within budgets set for the deployment target.

Rationale: a single-VPS deployment stays predictable and affordable only if every
frame loop is bounded and no resource grows without limit.

### III. Scientific Basis for Health Features

Every health-related feature, threshold, recommendation, or claim MUST cite
peer-reviewed literature in a per-feature reference list. Without evidence, the
feature ships labeled "experimental" or does not ship. The product monitors posture;
it MUST NOT present medical diagnoses, and user-facing health copy MUST carry an
appropriate disclaimer.

Rationale: users act on health guidance, and the project targets paper publication;
unsourced claims endanger both.

### IV. Progressive, Feedback-Driven ML Architecture

The posture engine MUST evolve in two phases. Phase 1: deterministic geometry —
angles, ratios, and thresholds computed directly from landmark coordinates. Phase 2:
a trained classifier (TensorFlow.js) that replaces heuristics as labeled data
accumulates. User feedback (confirm or correct on flagged events) is the labeling
signal. Training data consists exclusively of landmark-derived features and user
labels — never frames. A later phase MUST NOT regress the accuracy of the one it
replaces.

Rationale: value ships before a dataset exists, and the model improves only from
evidence users actually confirm.

### V. Traceable Development History

All development MUST be committed to git in granular, reviewable commits with
conventional-commit messages, from project inception. History MUST NOT be rewritten
once pushed; corrections land as new commits.

Rationale: provenance for handoff and publication, and a bisectable record when
geometry or models misbehave.

### VI. Documentation for Handoff & Publication

Documentation MUST be sufficient for an independent engineer to take over the project
and for the work to be written up as a scientific paper: architecture overview, data
flow including the landmark-only data path, API references, methodology and experiment
logs for ML phases, and a data statement of everything stored. Feature work is not
done until its documentation is updated.

Rationale: the stated project goals are handoff and paper publication; documentation
written at the end reconstructs nothing.

### VII. Distinctive Persian RTL Experience

The UI MUST be Persian-first and fully RTL (`dir="rtl"`) at every breakpoint, with
Persian typography and Persian numerals in user-facing copy. The visual identity MUST
NOT be assembled from stock component-library defaults. Animation MUST be purposeful
(feedback and orientation, not decoration), GPU-cheap, and MUST honor
`prefers-reduced-motion`.

Rationale: a Persian-speaking audience reads right-to-left in a distinct typographic
culture; a generic dashboard look undermines the product, and gratuitous motion
excludes users who disable it.

## Technology Stack & Deployment Constraints

- Backend: Node.js. ML: TensorFlow.js — in-browser inference, Node-side training
  pipelines. Landmark extraction runs in the browser via browser-side memory-safe
  models — MediaPipe BlazePose or TensorFlow.js; the
  backend receives only landmark coordinates and derived metrics.
- Persistence: account data, landmark coordinates, derived metrics, and user feedback
  labels. No image, video, or frame blobs anywhere — schema, logs, backups, or
  analytics.
- Deployment: Docker containers targeting a single Linux VPS. Base images pinned,
  builds reproducible, configuration via environment variables. No managed cloud ML
  or storage services.
- Transport: HTTPS only. Endpoints that would accept pixel data MUST NOT exist.

## Development Workflow & Quality Gates

- Commit discipline enforces Principle V: small commits, conventional messages, full
  history retained.
- Review MUST verify constitution compliance, in particular: the no-pixel invariant
  (schema, logs, API surface), a citation behind every health claim, tensor disposal
  in changed ML code, and RTL correctness in UI changes.
- New non-trivial geometry or classifier logic ships with tests; privacy invariants
  are asserted in tests — no frame data in any persistence or network path.
- Persian user-facing copy is checked by a Persian speaker, and accessibility
  (keyboard, contrast, reduced motion) is verified with the UI work, not after it.

## Governance

This constitution is the authoritative standard for the project. Specs, plans, and
code MUST comply with it; where they conflict, this document wins — and if it is
wrong, amend it here first.

Amendments: propose the change with rationale, update this file, bump the version per
the policy below, note the change in the Sync Impact Report, and commit with a message
that names the new version. Amendments that invalidate existing code MUST include a
migration note.

Versioning: MAJOR for removals or redefinitions of principles that break prior
guidance; MINOR for a new principle or materially expanded guidance; PATCH for
clarifications and wording.

Compliance review: every review checks the privacy invariant, scientific citations,
resource bounds, and documentation upkeep. Complexity beyond this constitution MUST
be justified in the change that introduces it. Runtime development guidance lives in
the specs and plans under `.specify/`, which MUST NOT contradict this constitution.

**Version**: 1.1.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
