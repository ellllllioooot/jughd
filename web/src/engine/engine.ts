// Imperative detection engine (research §8): EventTarget-based, outside React,
// exposed to the UI through thin listeners. Owns the worker loop at 20 fps.
import { PoseClient } from "./pose";
import {
  computeSignals,
  computeTorsoScale,
  isPersonDetected,
  type BaselineInput,
  type Landmark,
} from "./geometry";
import { AlertManager, type AlertEvent, type PostureState } from "./alert-manager";
import type { Category } from "./thresholds";

const FRAME_INTERVAL_MS = 50; // 20 fps cap (constitution II: bounded loops)
const TARGET_SIZE = 256; // input downscaled to ~256px before inference (research §1)

export type EngineEventName =
  | "frame"
  | "calibrated"
  | "posture:ok"
  | "posture:deviation"
  | "alert"
  | "paused"
  | "resumed"
  | "background-delayed";

export class MonitorEngine extends EventTarget {
  private pose = new PoseClient();
  private alertManager = new AlertManager();
  private video: HTMLVideoElement | null = null;
  private timer: number | null = null;
  private busy = false;
  private baseline: BaselineInput | null = null;
  private latest: Landmark[] | null = null;
  private lastTick = 0;
  private delayedNotified = false;
  private wasPaused = true;
  private stopped = false;

  async start(video: HTMLVideoElement, model: "lite" | "full" = "full") {
    this.video = video;
    this.stopped = false;
    await this.pose.init(model);
    this.wireAlerts();
    this.lastTick = performance.now();
    this.timer = window.setInterval(() => void this.tick(), FRAME_INTERVAL_MS);
  }

  private wireAlerts() {
    this.alertManager.onAlert((e: AlertEvent) => {
      this.dispatchEvent(new CustomEvent("alert", { detail: e }));
    });
    this.alertManager.onStateChange((state: PostureState, category: Category | null) => {
      if (state === "paused") {
        this.wasPaused = true;
        this.dispatchEvent(new CustomEvent("paused"));
        return;
      }
      if (this.wasPaused) {
        this.wasPaused = false;
        this.dispatchEvent(new CustomEvent("resumed"));
      }
      if (state === "ok") {
        this.dispatchEvent(new CustomEvent("posture:ok"));
      } else {
        this.dispatchEvent(new CustomEvent("posture:deviation", { detail: { category } }));
      }
    });
  }

  private async tick() {
    if (this.stopped || this.busy || !this.video || this.video.readyState < 2) return;
    this.busy = true;
    const now = performance.now();
    // background throttling hint (research §4: never fail silently)
    if (
      document.hidden &&
      this.lastTick > 0 &&
      now - this.lastTick > 2000 &&
      !this.delayedNotified
    ) {
      this.delayedNotified = true;
      this.dispatchEvent(new CustomEvent("background-delayed"));
    }
    this.lastTick = now;
    try {
      const v = this.video;
      const scale = TARGET_SIZE / Math.max(v.videoWidth, v.videoHeight, 1);
      const bitmap = await createImageBitmap(v, {
        resizeWidth: Math.max(1, Math.round(v.videoWidth * scale)),
        resizeHeight: Math.max(1, Math.round(v.videoHeight * scale)),
        resizeQuality: "low",
      });
      const landmarks = await this.pose.detect(bitmap, now);
      this.latest = landmarks;
      this.dispatchEvent(new CustomEvent("frame", { detail: { landmarks } }));

      const present = landmarks !== null && isPersonDetected(landmarks);
      if (present && this.baseline) {
        this.alertManager.push(computeSignals(landmarks!, this.baseline), now, landmarks);
      } else {
        this.alertManager.push(null, now, null);
      }
    } catch {
      /* one bad frame — skip it */
    } finally {
      this.busy = false;
    }
  }

  /** Person-detected gate for calibration (spec edge cases). */
  isPersonPresent(): boolean {
    return this.latest !== null && isPersonDetected(this.latest);
  }

  /** Capture the current frame as the calibration baseline. */
  calibrate(): BaselineInput {
    if (!this.isPersonPresent()) {
      throw new Error("no person detected");
    }
    const baseline: BaselineInput = {
      landmarks: this.latest!,
      torsoScale: computeTorsoScale(this.latest!),
    };
    this.baseline = baseline;
    this.dispatchEvent(new CustomEvent("calibrated", { detail: baseline }));
    return baseline;
  }

  setBaseline(baseline: BaselineInput) {
    this.baseline = baseline;
  }

  /** Fresh posture-score timeline for a new monitoring session. */
  resetStats() {
    this.alertManager.reset();
    this.delayedNotified = false;
  }

  getStats() {
    return this.alertManager.getStats();
  }

  getLatestLandmarks(): Landmark[] | null {
    return this.latest;
  }

  stop() {
    this.stopped = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.pose.dispose();
  }
}
