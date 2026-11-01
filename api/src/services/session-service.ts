import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { getQuota, remainingSeconds } from "./quota-service";
import { sendPushToUser } from "../lib/push";

export function publicSession(s: {
  id: string;
  baselineId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number;
  alertCount: number;
  postureScore: number;
  status: string;
}) {
  return {
    id: s.id,
    baselineId: s.baselineId,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    durationSec: s.durationSec,
    alertCount: s.alertCount,
    postureScore: s.postureScore,
    status: s.status,
  };
}

export async function createSession(userId: string, baselineId: string) {
  const baseline = await prisma.baseline.findFirst({ where: { id: baselineId, userId } });
  if (!baseline) throw new ApiError(404, "NOT_FOUND", "baseline not found");
  const quota = await getQuota(userId);
  if (quota.exhausted) {
    throw new ApiError(402, "QUOTA_EXHAUSTED", "monthly monitoring allowance is used up");
  }
  return prisma.monitoringSession.create({
    data: { userId, baselineId, status: "ACTIVE" },
  });
}

export async function endSession(
  userId: string,
  sessionId: string,
  input: {
    endedAt: string;
    durationSec: number;
    postureScore: number;
    alertCount: number;
  }
) {
  const session = await prisma.monitoringSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new ApiError(404, "NOT_FOUND", "session not found");
  if (session.status !== "ACTIVE") return session; // replayed beacon/outbox write

  const now = Date.now();
  const endedAt = new Date(Math.min(new Date(input.endedAt).getTime(), now));
  const elapsedSec = Math.max(
    0,
    Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
  );
  const maxSec = Math.ceil(elapsedSec * 1.05);
  let durationSec = Math.max(0, Math.min(input.durationSec, maxSec));

  // Clamp to the month allowance so overages are zero (SC-005); a session that
  // runs out mid-way ends QUOTA_EXHAUSTED with its summary preserved.
  const quota = await getQuota(userId);
  const remaining = remainingSeconds(quota);
  let status: "COMPLETED" | "QUOTA_EXHAUSTED" = "COMPLETED";
  if (quota.exhausted || durationSec > remaining) {
    durationSec = Math.min(durationSec, remaining);
    status = "QUOTA_EXHAUSTED";
    // near-limit warning over Web Push (best effort)
    void sendPushToUser(userId, {
      title: "جغد — سهمیه مانیتورینگ",
      body: "سهمیه مانیتورینگ ماهانه شما تمام شده است.",
    });
  }

  return prisma.monitoringSession.update({
    where: { id: session.id },
    data: {
      endedAt,
      durationSec,
      alertCount: input.alertCount,
      postureScore: Math.min(100, Math.max(0, input.postureScore)),
      status,
    },
  });
}

/**
 * Stale sweep: sessions stuck ACTIVE >2h are completed with a clamped duration
 * so quota accounting never undercounts (T030 / SC-005).
 */
export function startSessionSweep(intervalMs = 10 * 60 * 1000) {
  const timer = setInterval(() => {
    void sweepStaleSessions();
  }, intervalMs);
  timer.unref();
  return timer;
}

export async function sweepStaleSessions(now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 3600 * 1000);
  const stuck = await prisma.monitoringSession.findMany({
    where: { status: "ACTIVE", startedAt: { lt: cutoff } },
    take: 100,
  });
  for (const s of stuck) {
    const quota = await getQuota(s.userId, now);
    const elapsed = Math.floor((now.getTime() - s.startedAt.getTime()) / 1000);
    const durationSec = Math.min(elapsed, remainingSeconds(quota));
    const alertCount = await prisma.postureAlert.count({ where: { sessionId: s.id } });
    await prisma.monitoringSession.update({
      where: { id: s.id },
      data: {
        status: durationSec >= remainingSeconds(quota) ? "QUOTA_EXHAUSTED" : "COMPLETED",
        endedAt: now,
        durationSec,
        alertCount,
      },
    });
  }
  return stuck.length;
}
