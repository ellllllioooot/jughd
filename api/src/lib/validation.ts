import { z } from "zod";

// Trust boundary: landmarks are arrays of finite numbers only (privacy invariant —
// there is no shape here that could receive pixels).
// strict: unknown keys (e.g. base64/blob fields) are rejected, not stripped —
// privacy invariant (constitution I): numbers only across the trust boundary
export const landmarkSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
    score: z.number().finite().min(0).max(1),
  })
  .strict();

export const landmarksSchema = z.array(landmarkSchema).length(33);

export const registerSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase()),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(3).max(254).transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const baselineSchema = z.object({
  landmarks: landmarksSchema,
  torsoScale: z.number().finite().positive(),
});

export const endSessionSchema = z.object({
  endedAt: z.string().datetime(),
  durationSec: z.number().int().min(0),
  // bounds are enforced by server-side clamping (contracts/api.md), not rejection
  postureScore: z.number().finite(),
  alertCount: z.number().int().min(0),
});

export const alertInputSchema = z.object({
  clientKey: z.string().uuid(),
  category: z.enum(["NECK", "SHOULDER", "SLOUCH"]),
  occurredAt: z.string().datetime(),
  landmarksSnapshot: landmarksSchema,
});

export const alertsBatchSchema = z.object({
  alerts: z.array(alertInputSchema).min(1).max(200),
});

export const verdictSchema = z.object({
  verdict: z.enum(["REAL", "FALSE"]),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(512),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export const listSessionsSchema = z.object({
  // opaque base64url cursor (startedAt|id tuple) — decoded in session-query
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
