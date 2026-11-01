import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

/** Opaque cursor over (startedAt desc, id desc). */
export function encodeCursor(s: { startedAt: Date; id: string }): string {
  return Buffer.from(`${s.startedAt.toISOString()}|${s.id}`).toString("base64url");
}

export function decodeCursor(cursor: string): { startedAt: Date; id: string } {
  try {
    const [iso, id] = Buffer.from(cursor, "base64url").toString().split("|");
    const startedAt = new Date(iso);
    if (!id || isNaN(startedAt.getTime())) throw new Error("bad cursor");
    return { startedAt, id };
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "invalid cursor");
  }
}

export async function listSessions(userId: string, cursor: string | undefined, limit: number) {
  const where: object = cursor
    ? (() => {
        const c = decodeCursor(cursor);
        return {
          userId,
          OR: [
            { startedAt: { lt: c.startedAt } },
            { startedAt: c.startedAt, id: { lt: c.id } },
          ],
        };
      })()
    : { userId };

  const rows = await prisma.monitoringSession.findMany({
    where,
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const items = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? encodeCursor(items[items.length - 1]) : null;
  return { items, nextCursor };
}

export async function getSessionWithAlerts(userId: string, id: string) {
  const session = await prisma.monitoringSession.findFirst({
    where: { id, userId },
    include: { alerts: { orderBy: { occurredAt: "asc" } } },
  });
  if (!session) throw new ApiError(404, "NOT_FOUND", "session not found");
  return session;
}
