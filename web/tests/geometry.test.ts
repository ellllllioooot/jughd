import { describe, expect, it } from "vitest";
import {
  computeSignals,
  computeTorsoScale,
  extractFeatures,
  isPersonDetected,
  type Landmark,
} from "../src/engine/geometry";
import { AlertManager, type AlertEvent } from "../src/engine/alert-manager";
import type { PostureSignals } from "../src/engine/geometry";
import { THRESHOLDS } from "../src/engine/thresholds";

/** Synthetic upright seated pose: ears above shoulders above hips, centered. */
function upright(): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    score: 0.9,
  }));
  lms[0] = { x: 0.5, y: 0.15, z: 0, score: 0.9 }; // nose
  lms[7] = { x: 0.56, y: 0.2, z: 0, score: 0.9 }; // left ear
  lms[8] = { x: 0.44, y: 0.2, z: 0, score: 0.9 }; // right ear
  lms[11] = { x: 0.62, y: 0.45, z: 0, score: 0.9 }; // left shoulder
  lms[12] = { x: 0.38, y: 0.45, z: 0, score: 0.9 }; // right shoulder
  lms[23] = { x: 0.6, y: 0.75, z: 0, score: 0.9 }; // left hip
  lms[24] = { x: 0.4, y: 0.75, z: 0, score: 0.9 }; // right hip
  return lms;
}

function withMod(lms: Landmark[], idx: number, dx: number, dy: number): Landmark[] {
  return lms.map((l, i) => (i === idx ? { ...l, x: l.x + dx, y: l.y + dy } : l));
}

const baseline = { landmarks: upright(), torsoScale: 0.3 };

describe("geometry features (constitution IV phase 1)", () => {
  it("computes torso scale as shoulder–hip distance", () => {
    expect(computeTorsoScale(upright())).toBeCloseTo(0.3, 5);
  });

  it("baseline against itself yields zero deviation", () => {
    const s = computeSignals(upright(), baseline);
    expect(s.NECK).toBeCloseTo(0, 5);
    expect(s.SHOULDER).toBeCloseTo(0, 5);
    expect(s.SLOUCH).toBeCloseTo(0, 5);
  });

  it("classifies forward-head posture as NECK deviation", () => {
    // both ears drop toward the shoulders = forward head
    let lms = withMod(upright(), 7, 0, 0.06);
    lms = withMod(lms, 8, 0, 0.06);
    const s = computeSignals(lms, baseline);
    expect(s.NECK).toBeGreaterThan(THRESHOLDS.NECK.thetaHigh);
    expect(s.NECK).toBeGreaterThan(s.SLOUCH);
  });

  it("classifies trunk lean as SLOUCH deviation", () => {
    // shoulders shift sideways while hips stay → trunk no longer vertical
    let lms = withMod(upright(), 11, -0.12, 0);
    lms = withMod(lms, 12, -0.12, 0);
    const s = computeSignals(lms, baseline);
    expect(s.SLOUCH).toBeGreaterThan(THRESHOLDS.SLOUCH.thetaHigh);
  });

  it("classifies shoulder tilt as SHOULDER deviation", () => {
    const lms = withMod(upright(), 11, 0, 0.08); // one shoulder drops
    const s = computeSignals(lms, baseline);
    expect(s.SHOULDER).toBeGreaterThan(THRESHOLDS.SHOULDER.thetaHigh);
  });

  it("is scale-invariant: scaling the whole pose keeps deviations equal", () => {
    const base = { landmarks: upright(), torsoScale: 0.3 };
    const scaled = upright().map((l) => ({ ...l, x: 0.5 + (l.x - 0.5) * 2, y: 0.5 + (l.y - 0.5) * 2 }));
    const scaledMod = withMod(scaled, 7, 0, 0.12); // 2× the 0.06 offset
    const a = computeSignals(withMod(upright(), 7, 0, 0.06), base);
    const b = computeSignals(scaledMod, { landmarks: scaled, torsoScale: 0.6 });
    expect(b.NECK).toBeCloseTo(a.NECK, 3);
  });

  it("requires high-confidence ears/shoulders/hips for person detection", () => {
    expect(isPersonDetected(upright())).toBe(true);
    const low = upright().map((l, i) => (i === 7 ? { ...l, score: 0.2 } : l));
    expect(isPersonDetected(low)).toBe(false);
    expect(isPersonDetected([])).toBe(false);
  });

  it("extractFeatures stays finite on degenerate input", () => {
    const flat = upright().map((l) => ({ ...l, x: 0.5, y: 0.5 }));
    const f = extractFeatures(flat);
    expect(Number.isFinite(f.earShoulderOffset)).toBe(true);
    expect(Number.isFinite(f.trunkLean)).toBe(true);
    expect(computeTorsoScale(flat)).toBe(0);
  });
});

function signals(neck: number, shoulder = 0, slouch = 0): PostureSignals {
  return { NECK: neck, SHOULDER: shoulder, SLOUCH: slouch };
}

function run(
  manager: AlertManager,
  frames: { t: number; s: PostureSignals | null }[]
): { alerts: AlertEvent[]; states: string[] } {
  const alerts: AlertEvent[] = [];
  const states: string[] = [];
  manager.onAlert((e) => alerts.push(e));
  manager.onStateChange((s) => states.push(s));
  for (const f of frames) {
    manager.push(f.s, f.t, f.s ? upright() : null);
  }
  return { alerts, states };
}

const HI = THRESHOLDS.NECK.thetaHigh;
const LO = THRESHOLDS.NECK.thetaLow;

describe("alert state machine (FR-006: sustain, hysteresis, cooldown)", () => {
  it("alerts only after T_sustain of continuous deviation", () => {
    const m = new AlertManager();
    const { alerts } = run(m, [
      { t: 0, s: signals(HI * 1.2) },
      { t: 1000, s: signals(HI * 1.2) },
      { t: 2999, s: signals(HI * 1.2) },
      { t: 3000, s: signals(HI * 1.2) },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].category).toBe("NECK");
  });

  it("does not alert when deviation recovers before T_sustain", () => {
    const m = new AlertManager();
    const { alerts } = run(m, [
      { t: 0, s: signals(HI * 1.2) },
      { t: 2500, s: signals(0) },
      { t: 5000, s: signals(0) },
    ]);
    expect(alerts).toHaveLength(0);
    expect(m.getState()).toBe("ok");
  });

  it("hysteresis: θ_low recovery boundary keeps pending state between θ_low and θ_high", () => {
    const m = new AlertManager();
    const { alerts } = run(m, [
      { t: 0, s: signals(HI * 1.2) },
      // dips below θ_high but stays above θ_low → still pending, timer continues
      { t: 1500, s: signals(LO + 0.001) },
      { t: 3000, s: signals(LO + 0.001) },
    ]);
    expect(alerts).toHaveLength(1); // sustained the whole time
  });

  it("re-alerts only after recovery or cooldown", () => {
    const m = new AlertManager();
    const { alerts } = run(m, [
      { t: 0, s: signals(HI * 1.2) },
      { t: 3000, s: signals(HI * 1.2) }, // alert #1
      { t: 45_000, s: signals(HI * 1.2) }, // still deviated, cooldown not passed
      { t: 63_000, s: signals(HI * 1.2) }, // 60s after alert #1 → alert #2
    ]);
    expect(alerts).toHaveLength(2);
  });

  it("allows immediate re-alert after recovery", () => {
    const m = new AlertManager();
    const { alerts } = run(m, [
      { t: 0, s: signals(HI * 1.2) },
      { t: 3000, s: signals(HI * 1.2) }, // alert #1
      { t: 4000, s: signals(0) }, // recovery
      { t: 8000, s: signals(HI * 1.2) },
      { t: 11_000, s: signals(HI * 1.2) }, // alert #2 without cooldown
    ]);
    expect(alerts).toHaveLength(2);
  });

  it("tags alerts with the category and a geometric reason (SC-003)", () => {
    const m = new AlertManager();
    const { alerts } = run(m, [
      { t: 0, s: signals(0, HI * 1.2, 0) },
      { t: 3000, s: signals(0, HI * 1.2, 0) },
    ]);
    expect(alerts[0].category).toBe("SHOULDER");
    expect(alerts[0].reason).toBeTruthy();
    expect(alerts[0].snapshot).toHaveLength(33);
  });
});

describe("posture score timeline (SC-010)", () => {
  it("score = share of monitored time in good posture", () => {
    const m = new AlertManager();
    run(m, [
      { t: 0, s: signals(0) },
      { t: 2000, s: signals(0) }, // 2s good
      { t: 4000, s: signals(HI * 1.2) }, // 2s bad (below θ_low? no — above)
      { t: 6000, s: signals(HI * 1.2) },
    ]);
    const stats = m.getStats();
    expect(stats.monitoredMs).toBe(6000);
    expect(stats.goodMs).toBe(2000);
    expect(stats.postureScore).toBeCloseTo((2000 / 6000) * 100, 5);
  });

  it("paused time counts toward neither score nor monitoring", () => {
    const m = new AlertManager();
    run(m, [
      { t: 0, s: signals(0) },
      { t: 1000, s: signals(0) },
      { t: 5000, s: null }, // 4s paused
      { t: 6000, s: signals(0) },
    ]);
    const stats = m.getStats();
    expect(stats.monitoredMs).toBe(2000);
    expect(stats.goodMs).toBe(2000);
    expect(stats.postureScore).toBe(100);
    expect(m.getState()).toBe("ok"); // last frame good
  });

  it("zero-alert session with good posture scores 100 (edge case)", () => {
    const m = new AlertManager();
    run(m, [
      { t: 0, s: signals(0) },
      { t: 10_000, s: signals(0) },
    ]);
    expect(m.getStats().postureScore).toBe(100);
  });

  it("emits deviation state with the deviating category", () => {
    const m = new AlertManager();
    const seen: string[] = [];
    m.onStateChange((s, cat) => seen.push(`${s}:${cat ?? "-"}`));
    run(m, [
      { t: 0, s: null },
      { t: 100, s: signals(0) },
      { t: 200, s: signals(HI * 1.2) },
    ]);
    expect(seen).toContain("deviation:NECK");
    expect(seen).toContain("paused:-");
  });
});
