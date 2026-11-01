// Alert state machine per category (research §2 / FR-006):
// deviation ≥ θ_high sustained for T_sustain → alert; recovery below θ_low
// (hysteresis) returns to OK; re-alert only after recovery or T_cooldown.
import type { Landmark, PostureSignals } from "./geometry";
import { THRESHOLDS, type Category, type CategoryThreshold } from "./thresholds";

export interface AlertEvent {
  id: string; // doubles as the outbox clientKey
  category: Category;
  occurredAt: number; // wall-clock ms
  snapshot: Landmark[]; // 33 landmarks at alert time (numbers only)
  reason: string; // geometric reason, shown to the user (SC-003)
}

export type PostureState = "ok" | "deviation" | "paused";

type CatState =
  | { mode: "OK" }
  | { mode: "PENDING"; since: number }
  | { mode: "ALERTED"; alertAt: number };

export interface TimelineStats {
  monitoredMs: number;
  goodMs: number;
  postureScore: number; // 0–100 = share of monitored time in good posture
}

const REASONS: Record<Category, string> = {
  NECK: "گردن رو به جلو خم شده است",
  SHOULDER: "شانه‌ها گرد یا نامتقارن شده‌اند",
  SLOUCH: "تنه به جلو خم شده (نشستن قوزکرده)",
};

export class AlertManager {
  private cats: Record<Category, CatState> = {
    NECK: { mode: "OK" },
    SHOULDER: { mode: "OK" },
    SLOUCH: { mode: "OK" },
  };
  private state: PostureState = "paused";
  private monitoredMs = 0;
  private goodMs = 0;
  private lastTs: number | null = null;
  private alertListeners: ((e: AlertEvent) => void)[] = [];
  private stateListeners: ((s: PostureState, category: Category | null) => void)[] = [];

  constructor(private thresholds: Record<Category, CategoryThreshold> = THRESHOLDS) {}

  onAlert(cb: (e: AlertEvent) => void) {
    this.alertListeners.push(cb);
  }

  onStateChange(cb: (s: PostureState, category: Category | null) => void) {
    this.stateListeners.push(cb);
  }

  /** Feed one frame. `signals` null = no person (paused time counts toward neither). */
  push(
    signals: PostureSignals | null,
    timestampMs: number,
    snapshot: Landmark[] | null
  ) {
    const dt = this.lastTs === null ? 0 : Math.max(0, timestampMs - this.lastTs);
    this.lastTs = timestampMs;

    if (!signals || !snapshot) {
      this.setState("paused", null);
      return;
    }

    this.monitoredMs += dt;

    let deviating: Category | null = null;
    for (const category of ["NECK", "SHOULDER", "SLOUCH"] as Category[]) {
      const t = this.thresholds[category];
      const s = signals[category];
      const cat = this.cats[category];

      if (s >= t.thetaLow && !deviating) deviating = category;

      if (cat.mode === "OK") {
        if (s >= t.thetaHigh) this.cats[category] = { mode: "PENDING", since: timestampMs };
      } else if (cat.mode === "PENDING") {
        if (s < t.thetaLow) {
          this.cats[category] = { mode: "OK" };
        } else if (timestampMs - cat.since >= t.sustainMs) {
          this.emit(category, timestampMs, snapshot);
          this.cats[category] = { mode: "ALERTED", alertAt: timestampMs };
        }
      } else {
        if (s < t.thetaLow) {
          this.cats[category] = { mode: "OK" };
        } else if (timestampMs - cat.alertAt >= t.cooldownMs) {
          this.emit(category, timestampMs, snapshot);
          this.cats[category] = { mode: "ALERTED", alertAt: timestampMs };
        }
      }
    }

    // good posture = every category below its recovery threshold
    if (!deviating) this.goodMs += dt;
    this.setState(deviating ? "deviation" : "ok", deviating);
  }

  private emit(category: Category, timestampMs: number, snapshot: Landmark[]) {
    const event: AlertEvent = {
      id: crypto.randomUUID(),
      category,
      occurredAt: Date.now(),
      snapshot,
      reason: REASONS[category],
    };
    for (const cb of this.alertListeners) cb(event);
  }

  private lastNotified: string | null = null;

  private setState(state: PostureState, category: Category | null) {
    this.state = state;
    const key = `${state}:${category ?? "-"}`;
    if (key === this.lastNotified) return;
    this.lastNotified = key;
    for (const cb of this.stateListeners) cb(state, category);
  }

  getState(): PostureState {
    return this.state;
  }

  /** Fresh timeline/state for a new monitoring session. */
  reset() {
    this.cats = { NECK: { mode: "OK" }, SHOULDER: { mode: "OK" }, SLOUCH: { mode: "OK" } };
    this.monitoredMs = 0;
    this.goodMs = 0;
    this.lastTs = null;
  }

  getStats(): TimelineStats {
    return {
      monitoredMs: this.monitoredMs,
      goodMs: this.goodMs,
      postureScore: this.monitoredMs === 0 ? 100 : (this.goodMs / this.monitoredMs) * 100,
    };
  }
}
