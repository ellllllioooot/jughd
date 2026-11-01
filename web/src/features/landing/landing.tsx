import { Link } from "react-router-dom";
import { Owl } from "../../design/owl";

export default function LandingPage() {
  return (
    <main className="stack" style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-12)", textAlign: "center" }}>
      <Owl size={96} className="owl-hero" />
      <h1>جغد — نظارت هوشمند وضعیت بدن</h1>
      <p style={{ color: "var(--color-ink-muted)" }}>
        با دوربین لپ‌تاپ خود بنشینید؛ جغد وضعیت گردن، شانه‌ها و نشستن شما را زیر نظر می‌گیرد و هشدار می‌دهد.
        همه پردازش تصویر روی دستگاه شما انجام می‌شود.
      </p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link to="/register" className="btn btn-primary">
          شروع رایگان
        </Link>
        <Link to="/login" className="btn">
          ورود
        </Link>
      </div>
    </main>
  );
}
