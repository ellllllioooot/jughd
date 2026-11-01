import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth-context";
import { toPersianError } from "../../lib/errors";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailOrUsername.trim() || !password) {
      setFieldError("ایمیل/نام کاربری و رمز عبور الزامی است.");
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      await login({ emailOrUsername: emailOrUsername.trim(), password });
      navigate("/monitor", { replace: true });
    } catch (err) {
      setError(toPersianError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="stack" style={{ maxWidth: 420, margin: "0 auto", padding: "var(--space-8)" }}>
      <h1>ورود به جغد</h1>
      <form className="stack card" onSubmit={onSubmit} noValidate>
        <label className="stack" style={{ gap: "var(--space-1)" }}>
          ایمیل یا نام کاربری
          <input
            className="input"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
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
            autoComplete="current-password"
            dir="ltr"
          />
        </label>
        {fieldError && <p className="field-error">{fieldError}</p>}
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "در حال ورود…" : "ورود"}
        </button>
      </form>
      <p>
        حساب ندارید؟ <Link to="/register">ثبت‌نام کنید</Link>
      </p>
    </main>
  );
}
