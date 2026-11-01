import type { AlertCategory } from "../../lib/api";
import { CATEGORY_FA } from "../../lib/messages";
import { fa, faDuration } from "../../design/persian";
import type { AlertEvent } from "../../engine/alert-manager";
import type { PostureState } from "../../engine/alert-manager";
import type { Category } from "../../engine/thresholds";

interface Props {
  posture: { state: PostureState; category: Category | null };
  alerts: AlertEvent[];
  monitoredSec: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onEnd: () => void;
  backgroundDelayed: boolean;
}

const STATE_COPY: Record<PostureState, string> = {
  ok: "وضعیت بدن خوب است",
  deviation: "انحراف وضعیت",
  paused: "متوقف — شخص در تصویر نیست",
};

/** Live session UI (T024): posture state, paused semantics, sound toggle. */
export function SessionPanel({
  posture,
  alerts,
  monitoredSec,
  soundOn,
  onToggleSound,
  onEnd,
  backgroundDelayed,
}: Props) {
  return (
    <section className="stack">
      <div className="card stack" aria-live="polite">
        <strong>
          {STATE_COPY[posture.state]}
          {posture.state === "deviation" && posture.category
            ? ` — ${CATEGORY_FA[posture.category as AlertCategory]}`
            : ""}
        </strong>
        <span style={{ color: "var(--color-ink-muted)" }}>
          زمان مانیتورینگ: {faDuration(monitoredSec)}
        </span>
        {posture.state === "paused" && (
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
            زمان توقف نه در امتیاز وضعیت و نه در سهمیه ماهانه محاسبه می‌شود.
          </p>
        )}
        {backgroundDelayed && (
          <p style={{ color: "var(--color-warn)", fontSize: "var(--text-sm)" }}>
            نظارت در پس‌زمینه ممکن است با تأخیر انجام شود؛ برای دقت بیشتر این تب را باز نگه دارید.
          </p>
        )}
        <div className="row">
          <button className="btn" onClick={onToggleSound} aria-pressed={soundOn}>
            صدای هشدار: {soundOn ? "روشن" : "خاموش"}
          </button>
          <button className="btn btn-primary" onClick={onEnd}>
            پایان جلسه
          </button>
        </div>
      </div>

      <div className="card stack">
        <h2>هشدارهای این جلسه ({fa(alerts.length)})</h2>
        {alerts.length === 0 && <p>هنوز هشداری ثبت نشده است.</p>}
        <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
          {alerts.map((a) => (
            <li key={a.id} className="row" style={{ justifyContent: "space-between" }}>
              <span>
                {CATEGORY_FA[a.category as AlertCategory]} — {a.reason}
              </span>
              <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
                {new Date(a.occurredAt).toLocaleTimeString("fa-IR")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
