import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/auth-context";
import { RequireAuth } from "./protected";
import { ErrorBoundary } from "./error-boundary";
import { Owl } from "../design/owl";
import { fa } from "../design/persian";

const LandingPage = lazy(() => import("../features/landing/landing"));
const LoginPage = lazy(() => import("../features/auth/login"));
const RegisterPage = lazy(() => import("../features/auth/register"));
const MonitorPage = lazy(() => import("../features/monitor/monitor"));
const DashboardPage = lazy(() => import("../features/dashboard/dashboard"));

function Header() {
  const { user, logout, quota } = useAuth();
  const navigate = useNavigate();
  return (
    <header
      className="row"
      style={{
        justifyContent: "space-between",
        padding: "var(--space-3) var(--space-6)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <Link to="/" className="row" style={{ textDecoration: "none", color: "inherit", gap: "var(--space-2)" }}>
        <Owl size={36} />
        <strong>جغد</strong>
      </Link>
      <nav className="row">
        {user ? (
          <>
            <Link to="/monitor">مانیتورینگ</Link>
            <Link to="/dashboard">داشبورد</Link>
            {quota && (
              <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-sm)" }}>
                {fa(Math.floor(quota.usedSeconds / 3600))} از {fa(Math.floor(quota.limitSeconds / 3600))} ساعت
              </span>
            )}
            <button
              className="btn"
              onClick={async () => {
                await logout();
                navigate("/", { replace: true });
              }}
            >
              خروج
            </button>
          </>
        ) : (
          <>
            <Link to="/login">ورود</Link>
            <Link to="/register" className="btn btn-primary">
              ثبت‌نام
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <Suspense fallback={<p style={{ padding: "var(--space-8)" }}>در حال بارگیری…</p>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/monitor"
                element={
                  <RequireAuth>
                    <MonitorPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <DashboardPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
