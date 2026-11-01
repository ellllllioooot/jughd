import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

export async function createBaseline(
  userId: string,
  input: { landmarks: unknown; torsoScale: number }
) {
  return prisma.baseline.create({
    data: { userId, landmarks: input.landmarks as object, torsoScale: input.torsoScale },
  });
}

/** Current baseline = latest per user (data-model.md). */
export async function getCurrentBaseline(userId: string) {
  const baseline = await prisma.baseline.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!baseline) throw new ApiError(404, "NO_BASELINE", "no calibration baseline yet");
  return baseline;
}

export function publicBaseline(b: {
  id: string;
  landmarks: unknown;
  torsoScale: number;
  createdAt: Date;
}) {
  return {
    id: b.id,
    landmarks: b.landmarks,
    torsoScale: b.torsoScale,
    createdAt: b.createdAt.toISOString(),
  };
}
