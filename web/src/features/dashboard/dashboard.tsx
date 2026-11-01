import { HistoryList } from "./history";
import { InsightsPanel } from "./insights";

export default function DashboardPage() {
  return (
    <main className="stack" style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-8)" }}>
      <h1>داشبورد</h1>
      <InsightsPanel />
      <HistoryList />
    </main>
  );
}
