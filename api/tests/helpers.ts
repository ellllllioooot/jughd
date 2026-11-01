import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { resetRateLimits } from "../src/lib/ratelimit";

export const app = createApp();

export async function resetDb() {
  resetRateLimits();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "PostureAlert", "MonitoringSession", "AuthSession", "PushSubscription", "Baseline", "User" CASCADE'
  );
}

export function newAgent() {
  return request.agent(app);
}

export async function registerUser(
  agent: request.Agent,
  overrides: Partial<{ email: string; username: string; password: string }> = {}
) {
  const res = await agent.post("/api/v1/auth/register").send({
    email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`,
    username: overrides.username ?? `user_${Math.random().toString(36).slice(2, 10)}`,
    password: overrides.password ?? "password123",
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${res.text}`);
  return res.body.user as { id: string; email: string; username: string };
}

export function fakeLandmarks() {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0.5 + i * 0.001,
    y: 0.4,
    z: -0.1,
    score: 0.9,
  }));
}

export function sidCookie(res: request.Response): string | undefined {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith("sid="))?.split(";")[0];
}

export { prisma };
