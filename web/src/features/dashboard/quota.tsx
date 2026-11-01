import { useEffect, useState } from "react";
import { api, type Quota } from "../../lib/api";
import { toPersianError } from "../../lib/errors";
import { fa, faDuration } from "../../design/persian";

const NEAR_LIMIT_SEC = 1800;

function TierCard({
  name,
  limitFa,
  features,
  current,
}: {
  name: string;
  limitFa: string;
  features: string[];
  current: boolean;
}) {
  return (
    <div
      className="stack"
      style={{
        flex: "1 1 220px",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-4)",
      }}
    >
      <strong>
        {name}
        {current && <span style={{ color: "var(--color-ink-muted)" }}> (طرح فعلی)</span>}
      </strong>
      <span>{limitFa}</span>
      <ul style={{ margin: 0, paddingInlineStart: "var(--space-4)" }}>
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {!current && (
        <button className="btn btn-primary" disabled>
          ارتقا به حرفه‌ای
        </button>
      )}
    </div>
  );
}

/** Quota meter + upgrade prompt (T046 / US6). No real payment in this version. */
export function QuotaPanel() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .quota()
      .then(setQuota)
      .catch((e) => setError(toPersianError(e)));
  }, []);

  if (error) return <p style={{ color: "var(--color-danger)" }}>{error}</p>;
  if (!quota) return <p>در حال بارگذاری…</p>;

  const remaining = Math.max(0, quota.limitSeconds - quota.usedSeconds);
  const pct =
    quota.limitSeconds > 0
      ? Math.min(100, (quota.usedSeconds / quota.limitSeconds) * 100)
      : 0;
  const near = !quota.exhausted && remaining <= NEAR_LIMIT_SEC;
  const barColor = quota.exhausted
    ? "var(--color-danger)"
    : near
      ? "var(--color-warn)"
      : "var(--color-accent)";

  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>سهمیه مانیتورینگ ماهانه</h2>
      <div
        role="meter"
        aria-label="سهمیه مصرف‌شده ماهانه"
        aria-valuenow={quota.usedSeconds}
        aria-valuemin={0}
        aria-valuemax={quota.limitSeconds}
        style={{
          height: 12,
          borderRadius: "var(--radius-sm)",
          background: "var(--color-surface-2)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: barColor }} />
      </div>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <span>مصرف‌شده: {faDuration(quota.usedSeconds)}</span>
        <span>
          باقی‌مانده: {faDuration(remaining)} از {faDuration(quota.limitSeconds)}
        </span>
      </div>
      {quota.exhausted && (
        <p style={{ color: "var(--color-danger)" }}>
          سهمیه این ماه تمام شده است؛ تا شروع ماه بعد جلسه جدیدی آغاز نمی‌شود. همه داده‌های قبلی
          کامل در دسترس‌اند.
        </p>
      )}
      {near && (
        <p style={{ color: "var(--color-warn)" }}>
          کمتر از {fa(Math.max(1, Math.round(remaining / 60)))} دقیقه از سهمیه ماهانه شما باقی
          مانده است.
        </p>
      )}

      <div className="row" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
        <TierCard
          name="رایگان"
          limitFa="۱۲ ساعت مانیتورینگ در ماه"
          features={["هشدار وضعیت بدن", "استراحت چشم", "تاریخچه و داشبورد"]}
          current={quota.limitSeconds <= 43200}
        />
        <TierCard
          name="حرفه‌ای"
          limitFa="۱۲۰ ساعت مانیتورینگ در ماه"
          features={["همه امکانات نسخه رایگان", "سهمیه ۱۰ برابر"]}
          current={quota.limitSeconds > 43200}
        />
      </div>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
        پردازش پرداخت در این نسخه انجام نمی‌شود؛ دکمه ارتقا غیرفعال است.
      </p>
    </section>
  );
}
