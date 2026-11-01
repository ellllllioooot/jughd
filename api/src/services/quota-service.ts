import { config } from "../lib/config";
import { prisma } from "../lib/prisma";

// Tier limits in monitored seconds per calendar month. PRO is a placeholder
// while the upgrade flow is a stub — no payment in this feature (US6).
const TIER_LIMIT_SECONDS: Record<string, number> = {
  FREE: config.freeMonthlySeconds,
  PRO: config.freeMonthlySeconds * 10,
};

export function monthWindow(now: Date = new Date()) {
  return {
    periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function getQuota(userId: string, now: Date = new Date()) {
  const { periodStart, periodEnd } = monthWindow(now);
  const [sum, user] = await Promise.all([
    prisma.monitoringSession.aggregate({
      where: { userId, startedAt: { gte: periodStart, lt: periodEnd } },
      _sum: { durationSec: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { tier: true } }),
  ]);
  const usedSeconds = sum._sum.durationSec ?? 0;
  const limitSeconds = TIER_LIMIT_SECONDS[user?.tier ?? "FREE"] ?? config.freeMonthlySeconds;
  return {
    usedSeconds,
    limitSeconds,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    exhausted: usedSeconds >= limitSeconds,
  };
}

/** Seconds left in the caller's month allowance (internal clamping helper). */
export function remainingSeconds(quota: {
  usedSeconds: number;
  limitSeconds: number;
}): number {
  return Math.max(0, quota.limitSeconds - quota.usedSeconds);
}

export function quotaView(quota: Awaited<ReturnType<typeof getQuota>>) {
  return {
    usedSeconds: quota.usedSeconds,
    limitSeconds: quota.limitSeconds,
    periodStart: quota.periodStart,
    periodEnd: quota.periodEnd,
    exhausted: quota.exhausted,
  };
}
