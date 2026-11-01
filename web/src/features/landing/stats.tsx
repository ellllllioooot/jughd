import { useEffect, useState } from "react";
import { api, type GlobalStats } from "../../lib/api";
import { fa } from "../../design/persian";

const POLL_MS = 60_000; // matches the server's 60s cache

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: "1 1 140px", textAlign: "center" }}>
      <div style={{ fontSize: "var(--text-2xl)", fontWeight: 700, lineHeight: 1.3 }}>{value}</div>
      <div style={{ color: "var(--color-ink-muted)" }}>{label}</div>
    </div>
  );
}

/** Live anonymized platform totals (T049 / FR-021): polled, Persian numerals. */
export function LiveStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .globalStats()
        .then((s) => {
          if (alive) setStats(s);
        })
        .catch(() => {});
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (!stats) return null;

  return (
    <section className="card" aria-label="آمار کلی جغد">
      <div className="row" style={{ flexWrap: "wrap", justifyContent: "center" }}>
        <Stat label="کاربر" value={fa(stats.users)} />
        <Stat label="جلسه مانیتورینگ" value={fa(stats.sessions)} />
        <Stat label="ساعت مانیتورینگ" value={fa(stats.monitoredHours.toFixed(1))} />
        <Stat label="هشدار وضعیت" value={fa(stats.alerts)} />
      </div>
    </section>
  );
}
