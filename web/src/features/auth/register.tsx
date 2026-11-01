import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth-context";
import { toPersianError } from "../../lib/errors";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setFieldError("ایمیل معتبر نیست.");
      return;
    }
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      setFieldError("نام کاربری باید ۳ تا ۳۲ نویسه انگلیسی (حرف، عدد، زیرخط) باشد.");
      return;
    }
    if (password.length < 8) {
      setFieldError("رمز عبور باید دست‌کم ۸ نویسه باشد.");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      await register({ email: email.trim().toLowerCase(), username, password });
      navigate("/monitor", { replace: true });
    } catch (err) {
      setError(toPersianError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="stack" style={{ maxWidth: 420, margin: "0 auto", padding: "var(--space-8)" }}>
      <h1>ساخت حساب جغد</h1>
      <form className="stack card" onSubmit={onSubmit} noValidate>
        <label className="stack" style={{ gap: "var(--space-1)" }}>
          ایمیل
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            dir="ltr"
          />
        </label>
        <label className="stack" style={{ gap: "var(--space-1)" }}>
          نام کاربری
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoComplete="username"
            dir="ltr"
          />
        </label>
        <label className="stack" style={{ gap: "var(--space-1)" }}>
          رمز عبور
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
          />
        </label>
        {fieldError && <p className="field-error">{fieldError}</p>}
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "در حال ثبت‌نام…" : "ثبت‌نام"}
        </button>
      </form>
      <p>
        قبلاً ثبت‌نام کرده‌اید؟ <Link to="/login">وارد شوید</Link>
      </p>
    </main>
  );
}
