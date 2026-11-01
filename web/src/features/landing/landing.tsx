import { Link } from "react-router-dom";
import { Owl } from "../../design/owl";
import { LiveStats } from "./stats";

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

      <div className="row" style={{ flexWrap: "wrap", textAlign: "start" }}>
        <div className="card" style={{ flex: "1 1 200px" }}>
          <strong>حریم خصوصی پیش‌فرض</strong>
          <p style={{ margin: 0 }}>
            هیچ تصویری از مرورگر شما خارج نمی‌شود؛ فقط برآیندهای عددی برای هشدار و گزارش ثبت می‌شود.
          </p>
        </div>
        <div className="card" style={{ flex: "1 1 200px" }}>
          <strong>هشدارهای مستند</strong>
          <p style={{ margin: 0 }}>
            آستانه‌ها و نکته‌های سلامتی بر پایه منابع معتبر و با ذکر مأخذ ارائه می‌شوند.
          </p>
        </div>
        <div className="card" style={{ flex: "1 1 200px" }}>
          <strong>۱۲ ساعت رایگان در ماه</strong>
          <p style={{ margin: 0 }}>
            بدون نیاز به پرداخت شروع کنید؛ در صورت نیاز بیشتر، طرح حرفه‌ای در دسترس است.
          </p>
        </div>
      </div>

      <LiveStats />
    </main>
  );
}
