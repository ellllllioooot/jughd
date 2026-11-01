import { prisma } from "../lib/prisma";
import { publicSession } from "./session-service";

export async function dashboardSummary(userId: string) {
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000); // ~3 months (SC-006)
  const [sessions, real, confirmed, recent] = await Promise.all([
    prisma.monitoringSession.findMany({
      where: { userId, startedAt: { gte: since } },
      orderBy: { startedAt: "asc" },
      select: { startedAt: true, postureScore: true },
    }),
    prisma.postureAlert.count({ where: { userId, verdict: "REAL" } }),
    prisma.postureAlert.count({ where: { userId, verdict: { in: ["REAL", "FALSE"] } } }),
    prisma.monitoringSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const byDay = new Map<string, { sum: number; n: number }>();
  for (const s of sessions) {
    const date = s.startedAt.toISOString().slice(0, 10);
    const bucket = byDay.get(date) ?? { sum: 0, n: 0 };
    bucket.sum += s.postureScore;
    bucket.n += 1;
    byDay.set(date, bucket);
  }
  const postureScoreTrend = [...byDay.entries()].map(([date, b]) => ({
    date,
    postureScore: b.sum / b.n,
  }));

  return {
    postureScoreTrend,
    alertAccuracy: {
      real,
      confirmed,
      rate: confirmed > 0 ? real / confirmed : null,
    },
    recentSessions: recent.map(publicSession),
  };
}

let globalCache: { at: number; data: GlobalStats } | null = null;

export interface GlobalStats {
  users: number;
  sessions: number;
  monitoredHours: number;
  alerts: number;
}

/** Anonymized totals for the landing page, 60s in-memory cache. */
export async function globalStats(): Promise<GlobalStats> {
  if (globalCache && Date.now() - globalCache.at < 60_000) return globalCache.data;
  const [users, sessions, alerts, sums] = await Promise.all([
    prisma.user.count(),
    prisma.monitoringSession.count(),
    prisma.postureAlert.count(),
    prisma.monitoringSession.aggregate({ _sum: { durationSec: true } }),
  ]);
  const data = {
    users,
    sessions,
    monitoredHours: (sums._sum.durationSec ?? 0) / 3600,
    alerts,
  };
  globalCache = { at: Date.now(), data };
  return data;
}
