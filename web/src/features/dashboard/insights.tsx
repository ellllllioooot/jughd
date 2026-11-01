import { useEffect, useState } from "react";
import { api, type DashboardSummary } from "../../lib/api";
import { toPersianError } from "../../lib/errors";
import {
  EXERCISES,
  TIPS,
  rankByAlertMix,
  type ContentCategory,
  type ContentRecord,
} from "../../content";
import { fa } from "../../design/persian";

/* ---- trend chart (dataviz: single series, no legend; hover crosshair+tooltip;
   RTL time flows right→left; text in text tokens, marks in --color-chart-1) ---- */

const W = 640;
const H = 220;
const PLOT = { top: 12, bottom: H - 32, left: 8, right: W - 48 };

function xAt(i: number, n: number): number {
  if (n === 1) return (PLOT.left + PLOT.right) / 2;
  return PLOT.right - (i / (n - 1)) * (PLOT.right - PLOT.left);
}

function yAt(score: number): number {
  return PLOT.top + (1 - score / 100) * (PLOT.bottom - PLOT.top);
}

function faDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("fa-IR", {
    month: "short",
    day: "numeric",
  });
}

function TrendChart({ data }: { data: { date: string; postureScore: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;

  const ticks = n <= 4 ? data.map((_, i) => i) : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1) / 3)), n - 1];
  const direct = n <= 2 ? data.map((_, i) => i) : [0, n - 1];

  return (
    <div
      style={{ position: "relative" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const vbX = ((e.clientX - rect.left) / rect.width) * W;
        let best = 0;
        for (let i = 1; i < n; i++) {
          if (Math.abs(xAt(i, n) - vbX) < Math.abs(xAt(best, n) - vbX)) best = i;
        }
        setHover(best);
      }}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="روند امتیاز وضعیت در ۹۰ روز گذشته"
      >
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PLOT.right + 8}
              y={yAt(v)}
              fill="var(--color-ink-muted)"
              fontSize={11}
              dominantBaseline="middle"
            >
              {fa(v)}
            </text>
          </g>
        ))}

        {ticks.map((i) => (
          <text
            key={i}
            x={xAt(i, n)}
            y={H - 10}
            fill="var(--color-ink-muted)"
            fontSize={11}
            textAnchor="middle"
          >
            {faDate(data[i].date)}
          </text>
        ))}

        <polyline
          points={data.map((d, i) => `${xAt(i, n)},${yAt(d.postureScore)}`).join(" ")}
          fill="none"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* selective direct labels: endpoints only, never every point */}
        {direct.map((i) => (
          <text
            key={`l${i}`}
            x={xAt(i, n)}
            y={yAt(data[i].postureScore) - 10}
            fill="var(--color-ink)"
            fontSize={11}
            textAnchor={xAt(i, n) > W / 2 ? "end" : "start"}
          >
            {fa(Math.round(data[i].postureScore))}
          </text>
        ))}

        {hover !== null && (
          <g>
            <line
              x1={xAt(hover, n)}
              x2={xAt(hover, n)}
              y1={PLOT.top}
              y2={PLOT.bottom}
              stroke="var(--color-ink-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={xAt(hover, n)}
              cy={yAt(data[hover].postureScore)}
              r={5}
              fill="var(--color-chart-1)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(xAt(hover, n) / W) * 100}%`,
            top: 4,
            transform: "translateX(-50%)",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-1) var(--space-2)",
            fontSize: "var(--text-xs)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {faDate(data[hover].date)} — {fa(Math.round(data[hover].postureScore))}
        </div>
      )}

      <details style={{ marginTop: "var(--space-3)" }}>
        <summary style={{ cursor: "pointer", color: "var(--color-ink-muted)" }}>
          نمایش جدول داده‌ها
        </summary>
        <table style={{ width: "100%", marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "start" }}>تاریخ</th>
              <th style={{ textAlign: "start" }}>امتیاز وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.date}>
                <td>{faDate(d.date)}</td>
                <td>{fa(Math.round(d.postureScore))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function AccuracyTile({
  real,
  confirmed,
  rate,
}: {
  real: number;
  confirmed: number;
  rate: number | null;
}) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-3xl)", fontWeight: 700, lineHeight: 1.2 }}>
        {rate === null ? "—" : `${fa(Math.round(rate * 100))}٪`}
      </div>
      <div style={{ color: "var(--color-ink-muted)" }}>دقت طبقه‌بندی هشدارها</div>
      <div style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
        {confirmed === 0
          ? "هنوز هشدار تأییدشده‌ای ثبت نشده است"
          : `از ${fa(confirmed)} هشدار تأییدشده، ${fa(real)} مورد واقعی بود`}
      </div>
    </div>
  );
}

function ContentList({ records }: { records: ContentRecord[] }) {
  return (
    <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {records.map((r) => (
        <li key={r.id}>
          <strong>{r.title_fa}</strong>
          <p style={{ margin: 0 }}>{r.body_fa}</p>
          <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--text-xs)" }}>
            {r.citation.reference} —{" "}
            <a href={r.citation.url} target="_blank" rel="noreferrer">
              {r.citation.source}
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function InsightsPanel() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [mix, setMix] = useState<Partial<Record<ContentCategory, number>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.dashboardSummary();
        if (cancelled) return;
        setSummary(s);
        // alert-category mix for ranking content — derived from recent session
        // details (contract's summary response has no mix field)
        const details = await Promise.all(
          s.recentSessions.slice(0, 3).map((sess) => api.getSession(sess.id).catch(() => null))
        );
        if (cancelled) return;
        const counts: Partial<Record<ContentCategory, number>> = {};
        for (const d of details) {
          for (const a of d?.alerts ?? []) {
            counts[a.category] = (counts[a.category] ?? 0) + 1;
          }
        }
        setMix(counts);
      } catch (e) {
        if (!cancelled) setError(toPersianError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p style={{ color: "var(--color-danger)" }}>{error}</p>;
  if (!summary) return <p>در حال بارگذاری…</p>;

  return (
    <div className="stack">
      <section className="card stack">
        <h2 style={{ margin: 0 }}>روند امتیاز وضعیت</h2>
        {summary.postureScoreTrend.length === 0 ? (
          <p>هنوز جلسه‌ای ثبت نشده است؛ پس از اولین جلسه، روند اینجا نمایش داده می‌شود.</p>
        ) : (
          <TrendChart data={summary.postureScoreTrend} />
        )}
      </section>

      <section className="card">
        <AccuracyTile {...summary.alertAccuracy} />
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>نکته‌ها</h2>
        <ContentList records={rankByAlertMix(TIPS, mix)} />
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>تمرین‌ها</h2>
        <ContentList records={rankByAlertMix(EXERCISES, mix)} />
      </section>
    </div>
  );
}
