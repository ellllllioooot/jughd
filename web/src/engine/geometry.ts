// v1 classifier: deterministic geometry vs the calibrated baseline
// (constitution IV phase 1). Pure functions only — tested in web/tests.
import type { Category } from "./thresholds";

export interface Landmark {
  x: number;
  y: number;
  z: number;
  score: number;
}

export interface BaselineInput {
  landmarks: Landmark[]; // 33 BlazePose landmarks
  torsoScale: number; // shoulder–hip distance at calibration
}

/** BlazePose landmark indices. */
const NOSE = 0;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

/** Landmarks are present enough to trust the geometry (person-detected gate). */
export const MIN_SCORE = 0.5;

export function isPersonDetected(lms: Landmark[]): boolean {
  return (
    lms.length === 33 &&
    [NOSE, LEFT_EAR, RIGHT_EAR, LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP].every(
      (i) => (lms[i]?.score ?? 0) >= MIN_SCORE
    )
  );
}

interface Vec2 {
  x: number;
  y: number;
}

function mid(a: Landmark, b: Landmark): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function norm(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Shoulder–hip distance (normalization anchor, data-model.md). */
export function computeTorsoScale(lms: Landmark[]): number {
  const shoulder = mid(lms[LEFT_SHOULDER], lms[RIGHT_SHOULDER]);
  const hip = mid(lms[LEFT_HIP], lms[RIGHT_HIP]);
  return norm(sub(shoulder, hip));
}

/** Angle (rad) between two 2D vectors. */
function angleBetween(a: Vec2, b: Vec2): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (a.x * b.x + a.y * b.y) / (na * nb)));
  return Math.acos(cos);
}

/**
 * Geometry features for one frame. All distance features are divided by the
 * frame's torso scale (scale/depth invariant — research §2); angles are radians
 * (dimensionless).
 */
export interface PostureFeatures {
  /** vertical ear–shoulder offset / torsoScale */
  earShoulderOffset: number;
  /** head-forward angle: shoulder→ear vs trunk axis */
  headForwardAngle: number;
  /** shoulder-line tilt vs horizontal, radians */
  shoulderTilt: number;
  /** trunk lean vs vertical, radians */
  trunkLean: number;
}

export function extractFeatures(lms: Landmark[]): PostureFeatures {
  const ear = mid(lms[LEFT_EAR], lms[RIGHT_EAR]);
  const shoulder = mid(lms[LEFT_SHOULDER], lms[RIGHT_SHOULDER]);
  const hip = mid(lms[LEFT_HIP], lms[RIGHT_HIP]);
  const torso = computeTorsoScale(lms) || 1;

  const trunkAxis = sub(shoulder, hip); // hip → shoulder
  const earVector = sub(ear, shoulder); // shoulder → ear

  const shoulderLine = sub(lms[RIGHT_SHOULDER], lms[LEFT_SHOULDER]);
  const shoulderTilt = Math.abs(Math.atan2(Math.abs(shoulderLine.y), Math.abs(shoulderLine.x)));

  return {
    earShoulderOffset: (shoulder.y - ear.y) / torso,
    headForwardAngle: angleBetween(earVector, trunkAxis),
    shoulderTilt,
    trunkLean: Math.abs(Math.PI / 2 - angleBetween(trunkAxis, { x: 0, y: 1 })),
  };
}

export type PostureSignals = Record<Category, number>;

/**
 * Per-category deviation magnitude vs the calibrated baseline.
 * NECK: ear–shoulder vertical offset + head-forward angle.
 * SHOULDER: shoulder-line tilt + ear–shoulder shortening (rounding).
 * SLOUCH: shoulder–hip trunk lean.
 */
export function computeSignals(lms: Landmark[], baseline: BaselineInput): PostureSignals {
  const f = extractFeatures(lms);
  const b = extractFeatures(baseline.landmarks);
  return {
    NECK: Math.max(
      Math.abs(f.earShoulderOffset - b.earShoulderOffset),
      Math.abs(f.headForwardAngle - b.headForwardAngle)
    ),
    SHOULDER: Math.max(
      Math.abs(f.shoulderTilt - b.shoulderTilt),
      Math.max(0, b.earShoulderOffset - f.earShoulderOffset) // shortening = rounding
    ),
    SLOUCH: Math.abs(f.trunkLean - b.trunkLean),
  };
}
