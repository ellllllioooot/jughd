import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";

/** Redirects unauthenticated users to sign-in (T018). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: "var(--space-8)" }}>در حال بارگیری…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
