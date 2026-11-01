import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

export interface AlertInput {
  clientKey: string;
  category: "NECK" | "SHOULDER" | "SLOUCH";
  occurredAt: string;
  landmarksSnapshot: unknown;
}

/** Idempotent batch upsert keyed on unique clientKey — replays are no-ops. */
export async function addAlerts(userId: string, sessionId: string, alerts: AlertInput[]) {
  const session = await prisma.monitoringSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new ApiError(404, "NOT_FOUND", "session not found");

  const now = Date.now();
  const ids: Record<string, string> = {};
  let stored = 0;
  for (const a of alerts) {
    const existing = await prisma.postureAlert.findUnique({ where: { clientKey: a.clientKey } });
    if (existing) {
      if (existing.userId !== userId) throw new ApiError(404, "NOT_FOUND", "alert not found");
      ids[a.clientKey] = existing.id;
      continue;
    }
    // server-validated client clock (data-model.md)
    const t = new Date(a.occurredAt).getTime();
    if (t < session.startedAt.getTime() - 60_000 || t > now + 60_000) {
      throw new ApiError(400, "VALIDATION_ERROR", "occurredAt outside the session window");
    }
    const created = await prisma.postureAlert.create({
      data: {
        clientKey: a.clientKey,
        sessionId,
        userId,
        category: a.category,
        occurredAt: new Date(a.occurredAt),
        landmarksSnapshot: a.landmarksSnapshot as object,
      },
    });
    ids[a.clientKey] = created.id;
    stored += 1;
  }
  return { stored, ids };
}

/** Verdict is terminal: UNCONFIRMED → REAL|FALSE. */
export async function setVerdict(
  userId: string,
  alertId: string,
  verdict: "REAL" | "FALSE"
) {
  const alert = await prisma.postureAlert.findFirst({ where: { id: alertId, userId } });
  if (!alert) throw new ApiError(404, "NOT_FOUND", "alert not found");
  if (alert.verdict !== "UNCONFIRMED") {
    if (alert.verdict === verdict) return alert; // idempotent replay
    throw new ApiError(409, "ALREADY_VERIFIED", "verdict is already set");
  }
  return prisma.postureAlert.update({
    where: { id: alertId },
    data: { verdict, verdictAt: new Date() },
  });
}

export function publicAlert(a: {
  id: string;
  clientKey: string;
  category: string;
  occurredAt: Date;
  landmarksSnapshot: unknown;
  verdict: string;
  verdictAt: Date | null;
}) {
  return {
    id: a.id,
    clientKey: a.clientKey,
    category: a.category,
    occurredAt: a.occurredAt.toISOString(),
    landmarksSnapshot: a.landmarksSnapshot,
    verdict: a.verdict,
    verdictAt: a.verdictAt ? a.verdictAt.toISOString() : null,
  };
}
