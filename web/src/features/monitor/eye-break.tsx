import { useState } from "react";
import { EYE_BREAK_RULE } from "../../content";
import { fa } from "../../design/persian";

interface Props {
  monitoredSec: number;
}

const SNOOZE_SEC = 5 * 60;

/** Eye-break reminder (T042 / FR-013): 20-min continuous-session timer with
 *  cited rationale, dismiss/snooze. Monitored time excludes pauses. */
export function EyeBreakReminder({ monitoredSec }: Props) {
  const intervalSec = EYE_BREAK_RULE.intervalMinutes * 60;
  const currentInterval = Math.floor(monitoredSec / intervalSec);
  const [dismissedInterval, setDismissedInterval] = useState(0);
  const [snoozedUntilSec, setSnoozedUntilSec] = useState(0);

  const visible =
    currentInterval >= 1 &&
    currentInterval > dismissedInterval &&
    monitoredSec >= snoozedUntilSec;

  if (!visible) return null;

  return (
    <aside className="card stack" role="status">
      <strong>{EYE_BREAK_RULE.title_fa}</strong>
      <p>{EYE_BREAK_RULE.body_fa}</p>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
        منبع: {EYE_BREAK_RULE.citation.reference} —{" "}
        <a href={EYE_BREAK_RULE.citation.url} target="_blank" rel="noreferrer">
          {EYE_BREAK_RULE.citation.source}
        </a>
      </p>
      <div className="row">
        <button className="btn btn-primary" onClick={() => setDismissedInterval(currentInterval)}>
          متوجه شدم
        </button>
        <button className="btn" onClick={() => setSnoozedUntilSec(monitoredSec + SNOOZE_SEC)}>
          {fa(SNOOZE_SEC / 60)} دقیقه بعد
        </button>
      </div>
    </aside>
  );
}
