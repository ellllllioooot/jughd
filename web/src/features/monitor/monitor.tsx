import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MonitorEngine } from "../../engine/engine";
import type { AlertEvent, PostureState } from "../../engine/alert-manager";
import type { Category } from "../../engine/thresholds";
import { api, apiPath, type Session } from "../../lib/api";
import { toPersianError } from "../../lib/errors";
import { browserSupported, notifyUser, setSoundEnabled, soundEnabled, unlockAudio } from "../../lib/notify";
import { startKeepalive, stopKeepalive } from "../../lib/keepalive";
import { finalizeSession } from "../../lib/session-finalize";
import { enqueue, flush, startOutbox, stopOutbox } from "../../lib/outbox";
import { fa, faDuration } from "../../design/persian";
import { CalibrationPanel } from "./calibration";
import { SessionPanel } from "./session";
import type { FeedbackAlert } from "./feedback";

type Phase = "idle" | "calibrating" | "running" | "ended";

const CAMERA_ERRORS: Record<string, string> = {
  NotAllowedError: "دسترسی به دوربین رد شده است. لطفاً اجازه دسترسی را در مرورگر فعال کنید.",
  NotFoundError: "دوربینی روی این دستگاه پیدا نشد.",
  NotReadableError: "دوربین در دسترس نیست؛ شاید برنامه دیگری از آن استفاده می‌کند.",
};

export default function MonitorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MonitorEngine | null>(null);
  const [supported] = useState(browserSupported);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [personPresent, setPersonPresent] = useState(false);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [posture, setPosture] = useState<{ state: PostureState; category: Category | null }>({
    state: "paused",
    category: null,
  });
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);
  const [monitoredSec, setMonitoredSec] = useState(0);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
  const [quotaEnded, setQuotaEnded] = useState(false);
  const [backgroundDelayed, setBackgroundDelayed] = useState(false);
  const alertsRef = useRef<FeedbackAlert[]>([]);
  alertsRef.current = alerts;
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // overlay drawing of detected landmarks (camera preview + landmarks, T024)
  const drawOverlay = useCallback((landmarks: { x: number; y: number; score: number }[] | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;
    ctx.fillStyle = "rgba(245, 185, 66, 0.9)";
    for (const l of landmarks) {
      if (l.score < 0.5) continue;
      ctx.beginPath();
      ctx.arc(l.x * canvas.width, l.y * canvas.height, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const endSession = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !session) return;
    void flush(); // queued alerts/verdicts first (FR-007)
    const stats = engine.getStats();
    const summary = {
      endedAt: new Date().toISOString(),
      durationSec: Math.round(stats.monitoredMs / 1000),
      postureScore: Math.round(stats.postureScore * 100) / 100,
      alertCount: alertsRef.current.length,
    };
    // capture the server verdict — the session may end QUOTA_EXHAUSTED with the
    // summary clamped to the remaining allowance (SC-005)
    void api
      .endSession(session.id, summary)
      .then(({ session: ended }) => setQuotaEnded(ended.status === "QUOTA_EXHAUSTED"))
      .catch(() => finalizeSession(session.id, summary));
    setPhase("ended");
    stopKeepalive();
    stopOutbox();
    window.removeEventListener("beforeunload", finalizeHandler.current);
  }, [session]);

  const finalizeHandler = useRef<() => void>(() => {});

  async function startCamera() {
    setError(null);
    setBusy(true);
    try {
      unlockAudio(); // user-gesture gate for audio (research §3)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const engine = new MonitorEngine();
      engineRef.current = engine;
      engine.addEventListener("frame", (e) => {
        const { landmarks } = (e as CustomEvent).detail;
        drawOverlay(landmarks);
        setPersonPresent(engine.isPersonPresent());
      });
      engine.addEventListener("posture:ok", () => setPosture({ state: "ok", category: null }));
      engine.addEventListener("paused", () => setPosture({ state: "paused", category: null }));
      engine.addEventListener("resumed", () => setPosture({ state: "ok", category: null }));
      engine.addEventListener("posture:deviation", (e) => {
        const { category } = (e as CustomEvent).detail;
        setPosture({ state: "deviation", category });
      });
      engine.addEventListener("background-delayed", () => setBackgroundDelayed(true));
      // alert delivery (T027) + labeled-data pipeline (T035): SW notification,
      // optional sound, and an outbox record keyed by the client UUID
      engine.addEventListener("alert", (e) => {
        const alert = (e as CustomEvent).detail as AlertEvent;
        setAlerts((prev) => [...prev, { ...alert, verdict: "UNCONFIRMED" }]);
        const sid = sessionRef.current?.id;
        if (sid) {
          enqueue({
            type: "alert",
            sessionId: sid,
            alert: {
              clientKey: alert.id,
              category: alert.category,
              occurredAt: new Date(alert.occurredAt).toISOString(),
              landmarksSnapshot: alert.snapshot,
            },
          });
        }
        void notifyUser({
          title: "جغد — هشدار وضعیت بدن",
          body: alert.reason,
          tag: alert.id,
          withSound: soundOn,
        });
      });
      await engine.start(video);

      const current = await api.getCurrentBaseline().catch(() => null);
      setHasBaseline(current !== null);
      if (current) engine.setBaseline({ landmarks: current.baseline.landmarks, torsoScale: current.baseline.torsoScale });
      setPhase("calibrating");
    } catch (err) {
      const name = (err as { name?: string }).name ?? "";
      setError(CAMERA_ERRORS[name] ?? "خطا در دسترسی به دوربین.");
    } finally {
      setBusy(false);
    }
  }

  async function onCalibrate() {
    const engine = engineRef.current;
    if (!engine) return;
    setBusy(true);
    setError(null);
    try {
      const b = engine.calibrate();
      const res = await api.createBaseline({ landmarks: b.landmarks, torsoScale: b.torsoScale });
      engine.setBaseline(b);
      setHasBaseline(true);

      // warn when remaining quota is short (spec edge case)
      const quota = await api.quota().catch(() => null);
      const remaining = quota ? quota.limitSeconds - quota.usedSeconds : Infinity;
      if (remaining < 1800) {
        setQuotaWarning(
          `کمتر از ${fa(Math.max(1, Math.round(remaining / 60)))} دقیقه از سهمیه ماهانه شما باقی مانده است.`
        );
      }

      const { session: created } = await api.createSession({ baselineId: res.baseline.id });
      engine.resetStats();
      setAlerts([]);
      setSession(created);
      setPhase("running");
      startKeepalive(); // background-tab timer exemption (research §4)
      startOutbox(); // periodic + online flush of queued feedback (research §10)

      finalizeHandler.current = () => {
        void flush();
        const stats = engine.getStats();
        finalizeSession(created.id, {
          endedAt: new Date().toISOString(),
          durationSec: Math.round(stats.monitoredMs / 1000),
          postureScore: Math.round(stats.postureScore * 100) / 100,
          alertCount: alertsRef.current.length,
        });
      };
      window.addEventListener("beforeunload", finalizeHandler.current);
    } catch (err) {
      setError(toPersianError(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      const engine = engineRef.current;
      if (engine && phase === "running") {
        setMonitoredSec(Math.round(engine.getStats().monitoredMs / 1000));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      stopKeepalive();
      stopOutbox();
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!supported) {
    return (
      <main className="stack card" style={{ maxWidth: 560, margin: "var(--space-8) auto" }}>
        <h1>مرورگر پشتیبانی نمی‌شود</h1>
        <p>
          برای مانیتورینگ وضعیت به دوربین و اعلان‌های مرورگر نیاز است. لطفاً از یک مرورگر مدرن
          (کروم، فایرفاکس یا اج) روی دسکتاپ استفاده کنید.
        </p>
      </main>
    );
  }

  return (
    <main className="stack" style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-6)" }}>
      <h1>مانیتورینگ وضعیت</h1>

      <div className="row" style={{ alignItems: "flex-start", gap: "var(--space-6)", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 320px" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}
          />
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            aria-hidden
          />
        </div>

        <div className="stack" style={{ flex: "1 1 300px" }}>
          {phase === "idle" && (
            <section className="stack card">
              <h2>شروع مانیتورینگ</h2>
              <p>برای شروع، دسترسی به دوربین لازم است. همه پردازش تصویر روی دستگاه شما می‌ماند.</p>
              {error && <p className="field-error">{error}</p>}
              <button className="btn btn-primary" onClick={startCamera} disabled={busy}>
                {busy ? "در حال راه‌اندازی…" : "فعال‌سازی دوربین"}
              </button>
            </section>
          )}

          {phase === "calibrating" && (
            <CalibrationPanel
              personPresent={personPresent}
              hasBaseline={hasBaseline}
              busy={busy}
              error={error}
              onCalibrate={onCalibrate}
            />
          )}

          {phase === "running" && session && (
            <>
              {quotaWarning && <p style={{ color: "var(--color-warn)" }}>{quotaWarning}</p>}
              <SessionPanel
                posture={posture}
                alerts={alerts}
                monitoredSec={monitoredSec}
                soundOn={soundOn}
                onToggleSound={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  setSoundEnabled(next);
                }}
                onEnd={endSession}
                onVerdict={(clientKey, verdict) => {
                  setAlerts((prev) =>
                    prev.map((a) => (a.id === clientKey ? { ...a, verdict } : a))
                  );
                  enqueue({ type: "verdict", clientKey, verdict });
                  void flush();
                }}
                backgroundDelayed={backgroundDelayed}
              />
            </>
          )}

          {phase === "ended" && session && (
            <section className="stack card">
              <h2>جلسه پایان یافت</h2>
              {quotaEnded && (
                <p style={{ color: "var(--color-warn)" }}>
                  سهمیه ماهانه شما در پایان این جلسه تمام شد؛ خلاصه جلسه ذخیره شده است و تا شروع
                  ماه بعد جلسه جدیدی آغاز نمی‌شود.
                </p>
              )}
              <p>
                زمان مانیتورینگ: {faDuration(monitoredSec)} — امتیاز وضعیت:{" "}
                {fa(Math.round(engineRef.current?.getStats().postureScore ?? 0))} از ۱۰۰
              </p>
              <Link to="/dashboard" className="btn btn-primary">
                مشاهده در داشبورد
              </Link>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
