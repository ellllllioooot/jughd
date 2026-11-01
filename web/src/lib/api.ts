// Typed API client mirroring contracts/api.md.

export type Tier = "FREE" | "PRO";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "QUOTA_EXHAUSTED";
export type AlertCategory = "NECK" | "SHOULDER" | "SLOUCH";
export type AlertVerdict = "UNCONFIRMED" | "REAL" | "FALSE";

export interface Landmark {
  x: number;
  y: number;
  z: number;
  score: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  tier: Tier;
  createdAt: string;
}

export interface Quota {
  usedSeconds: number;
  limitSeconds: number;
  periodStart: string;
  periodEnd: string;
  exhausted: boolean;
}

export interface Baseline {
  id: string;
  landmarks: Landmark[];
  torsoScale: number;
  createdAt: string;
}

export interface Session {
  id: string;
  baselineId: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  alertCount: number;
  postureScore: number;
  status: SessionStatus;
}

export interface Alert {
  id: string;
  clientKey: string;
  category: AlertCategory;
  occurredAt: string;
  landmarksSnapshot: Landmark[];
  verdict: AlertVerdict;
  verdictAt: string | null;
}

export interface DashboardSummary {
  postureScoreTrend: { date: string; postureScore: number }[];
  alertAccuracy: { real: number; confirmed: number; rate: number | null };
  recentSessions: Session[];
}

export interface GlobalStats {
  users: number;
  sessions: number;
  monitoredHours: number;
  alerts: number;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_TAKEN"
  | "USERNAME_TAKEN"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "NO_BASELINE"
  | "QUOTA_EXHAUSTED"
  | "ALREADY_VERIFIED"
  | "RATE_LIMITED"
  | "INTERNAL";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string
  ) {
    super(message);
  }
}

export function apiPath(path: string): string {
  return `/api/v1${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiPath(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiClientError(
      res.status,
      (err?.code as ApiErrorCode) ?? "INTERNAL",
      err?.message ?? res.statusText
    );
  }
  return data as T;
}

export const api = {
  register: (body: { email: string; username: string; password: string }) =>
    request<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { emailOrUsername: string; password: string }) =>
    request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: User; quota: Quota }>("/auth/me"),
  quota: () => request<Quota>("/quota"),
  createBaseline: (body: { landmarks: Landmark[]; torsoScale: number }) =>
    request<{ baseline: Baseline }>("/baselines", { method: "POST", body: JSON.stringify(body) }),
  getCurrentBaseline: () => request<{ baseline: Baseline }>("/baselines/current"),
  createSession: (body: { baselineId: string }) =>
    request<{ session: Session }>("/sessions", { method: "POST", body: JSON.stringify(body) }),
  endSession: (id: string, body: {
    endedAt: string;
    durationSec: number;
    postureScore: number;
    alertCount: number;
  }) =>
    request<{ session: Session }>(`/sessions/${id}/end`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  addAlerts: (sessionId: string, alerts: {
    clientKey: string;
    category: AlertCategory;
    occurredAt: string;
    landmarksSnapshot: Landmark[];
  }[]) =>
    request<{ stored: number; ids: Record<string, string> }>(`/sessions/${sessionId}/alerts`, {
      method: "POST",
      body: JSON.stringify({ alerts }),
    }),
  setVerdict: (id: string, verdict: "REAL" | "FALSE") =>
    request<{ alert: Alert }>(`/alerts/${id}/verdict`, {
      method: "PATCH",
      body: JSON.stringify({ verdict }),
    }),
  listSessions: (cursor?: string, limit = 20) =>
    request<{ items: Session[]; nextCursor: string | null }>(
      `/sessions?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`
    ),
  getSession: (id: string) =>
    request<{ session: Session; alerts: Alert[] }>(`/sessions/${id}`),
  dashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),
  pushSubscribe: (body: { endpoint: string; p256dh: string; auth: string }) =>
    request<void>("/push/subscribe", { method: "POST", body: JSON.stringify(body) }),
  pushUnsubscribe: (endpoint: string) =>
    request<void>("/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) }),
  globalStats: () => request<GlobalStats>("/stats/global"),
};
