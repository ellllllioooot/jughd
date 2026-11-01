import { useEffect, useState } from "react";
import { api, type Alert, type Session } from "../../lib/api";
import { toPersianError } from "../../lib/errors";
import { CATEGORY_FA } from "../../lib/messages";
import { fa, faDuration } from "../../design/persian";

/** Session history (T038 / US4): summaries list with per-alert drill-in. */
export function HistoryList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ session: Session; alerts: Alert[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string) {
    try {
      const res = await api.listSessions(cursor);
      setSessions((prev) => (cursor ? [...prev, ...res.items] : res.items));
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(toPersianError(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openDetail(id: string) {
    try {
      setDetail(await api.getSession(id));
    } catch (err) {
      setError(toPersianError(err));
    }
  }

  return (
    <section className="stack">
      <h2>تاریخچه جلسات</h2>
      {error && <p className="field-error">{error}</p>}
      {sessions.length === 0 && !error && <p>هنوز جلسه‌ای ثبت نشده است.</p>}
      <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {sessions.map((s) => (
          <li key={s.id}>
            <button
              className="card row"
              style={{ width: "100%", justifyContent: "space-between", cursor: "pointer", textAlign: "start" }}
              onClick={() => void openDetail(s.id)}
            >
              <span>{new Date(s.startedAt).toLocaleString("fa-IR")}</span>
              <span>{faDuration(s.durationSec)}</span>
              <span>{fa(s.alertCount)} هشدار</span>
              <span>امتیاز وضعیت: {fa(Math.round(s.postureScore))}</span>
            </button>
          </li>
        ))}
      </ul>
      {nextCursor && (
        <button className="btn" onClick={() => void load(nextCursor ?? undefined)}>
          نمایش موارد بیشتر
        </button>
      )}

      {detail && (
        <section className="card stack">
          <h3>جزئیات جلسه — {new Date(detail.session.startedAt).toLocaleString("fa-IR")}</h3>
          <p>
            وضعیت:{" "}
            {detail.session.status === "COMPLETED"
              ? "تکمیل‌شده"
              : detail.session.status === "QUOTA_EXHAUSTED"
                ? "سهمیه تمام شده"
                : "در حال اجرا"}{" "}
            — امتیاز وضعیت: {fa(Math.round(detail.session.postureScore))}
          </p>
          {detail.alerts.length === 0 && <p>این جلسه هشداری نداشت.</p>}
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {detail.alerts.map((a) => (
              <li key={a.id} className="stack" style={{ gap: "var(--space-1)" }}>
                <strong>
                  {CATEGORY_FA[a.category]} — {new Date(a.occurredAt).toLocaleTimeString("fa-IR")}
                </strong>
                <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
                  وضعیت ثبت‌شده: {fa(a.landmarksSnapshot.length)} نقطه اسکلتی —{" "}
                  {a.verdict === "UNCONFIRMED"
                    ? "تأیید نشده"
                    : a.verdict === "REAL"
                      ? "واقعی"
                      : "اشتباه"}
                </span>
              </li>
            ))}
          </ul>
          <button className="btn" onClick={() => setDetail(null)}>
            بستن
          </button>
        </section>
      )}
    </section>
  );
}
