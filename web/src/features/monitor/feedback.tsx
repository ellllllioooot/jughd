import type { AlertCategory, AlertVerdict } from "../../lib/api";
import { CATEGORY_FA } from "../../lib/messages";
import type { AlertEvent } from "../../engine/alert-manager";

export interface FeedbackAlert extends AlertEvent {
  verdict: AlertVerdict;
}

interface Props {
  alerts: FeedbackAlert[];
  onVerdict: (clientKey: string, verdict: "REAL" | "FALSE") => void;
}

/** Alert confirmation UI (T034/FR-007): real/false verdicts form the labeled dataset. */
export function FeedbackList({ alerts, onVerdict }: Props) {
  if (alerts.length === 0) {
    return <p>هنوز هشداری ثبت نشده است.</p>;
  }
  return (
    <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {alerts.map((a) => (
        <li key={a.id} className="card stack" style={{ gap: "var(--space-2)", padding: "var(--space-4)" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>
              {CATEGORY_FA[a.category as AlertCategory]} — {a.reason}
            </strong>
            <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
              {new Date(a.occurredAt).toLocaleTimeString("fa-IR")}
            </span>
          </div>
          {a.verdict === "UNCONFIRMED" ? (
            <div className="row">
              <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
                آیا واقعاً وضعیت بدن شما نادرست بود؟
              </span>
              <button className="btn" onClick={() => onVerdict(a.id, "REAL")}>
                واقعی بود
              </button>
              <button className="btn" onClick={() => onVerdict(a.id, "FALSE")}>
                اشتباه بود
              </button>
            </div>
          ) : (
            <span style={{ color: a.verdict === "REAL" ? "var(--color-ok)" : "var(--color-ink-muted)" }}>
              {a.verdict === "REAL" ? "تأیید شد: واقعی" : "تأیید شد: اشتباه"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
