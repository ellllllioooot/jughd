import { beforeEach, describe, expect, it } from "vitest";
import type { Agent } from "supertest";
import { fakeLandmarks, newAgent, prisma, registerUser, resetDb } from "./helpers";

beforeEach(resetDb);

async function seedSession(
  agent: Agent,
  userId: string,
  startedAt: Date,
  postureScore: number
) {
  const baseline = await agent
    .post("/api/v1/baselines")
    .send({ landmarks: fakeLandmarks(), torsoScale: 0.3 });
  return prisma.monitoringSession.create({
    data: {
      userId,
      baselineId: baseline.body.baseline.id,
      startedAt,
      endedAt: new Date(startedAt.getTime() + 600_000),
      durationSec: 600,
      status: "COMPLETED",
      postureScore,
    },
  });
}

async function seedAlert(userId: string, sessionId: string, verdict: "REAL" | "FALSE") {
  return prisma.postureAlert.create({
    data: {
      clientKey: crypto.randomUUID(),
      sessionId,
      userId,
      category: "NECK",
      occurredAt: new Date(),
      landmarksSnapshot: fakeLandmarks(),
      verdict,
    },
  });
}

describe("dashboard summary (contracts/api.md)", () => {
  it("buckets the posture-score trend by day", async () => {
    const agent = newAgent();
    const user = await registerUser(agent);
    const day1 = new Date("2026-10-20T10:00:00Z");
    const day2 = new Date("2026-10-21T10:00:00Z");
    const s1 = await seedSession(agent, user.id, day1, 80);
    await seedSession(agent, user.id, new Date("2026-10-20T14:00:00Z"), 60);
    await seedSession(agent, user.id, day2, 90);

    const res = await agent.get("/api/v1/dashboard/summary");
    expect(res.status).toBe(200);
    expect(res.body.postureScoreTrend).toEqual([
      { date: "2026-10-20", postureScore: 70 },
      { date: "2026-10-21", postureScore: 90 },
    ]);
    expect(res.body.recentSessions[0].id).toBeTruthy();
    expect(s1.id).toBeTruthy();
  });

  it("computes alert accuracy with sample size and a null rate at zero confirmed", async () => {
    const agent = newAgent();
    const user = await registerUser(agent);
    const session = await seedSession(agent, user.id, new Date(), 85);
    await seedAlert(user.id, session.id, "REAL");
    await seedAlert(user.id, session.id, "REAL");
    await seedAlert(user.id, session.id, "FALSE");

    const res = await agent.get("/api/v1/dashboard/summary");
    expect(res.body.alertAccuracy).toEqual({ real: 2, confirmed: 3, rate: 2 / 3 });

    // unconfirmed alerts don't count toward the denominator
    await prisma.postureAlert.create({
      data: {
        clientKey: crypto.randomUUID(),
        sessionId: session.id,
        userId: user.id,
        category: "SLOUCH",
        occurredAt: new Date(),
        landmarksSnapshot: fakeLandmarks(),
      },
    });
    const res2 = await agent.get("/api/v1/dashboard/summary");
    expect(res2.body.alertAccuracy).toEqual({ real: 2, confirmed: 3, rate: 2 / 3 });

    // zero confirmed → rate is null (FR-011)
    const fresh = await registerUser(newAgent(), {
      email: "fresh@example.com",
      username: "fresh_user",
    });
    const freshAgent = newAgent();
    await freshAgent.post("/api/v1/auth/login").send({
      emailOrUsername: "fresh_user",
      password: "password123",
    });
    const empty = await freshAgent.get("/api/v1/dashboard/summary");
    expect(empty.body.alertAccuracy).toEqual({ real: 0, confirmed: 0, rate: null });
    expect(fresh.id).toBeTruthy();
  });

  it("isolates users' dashboards", async () => {
    const a = newAgent();
    const b = newAgent();
    const userA = await registerUser(a, { email: "dash-a@example.com", username: "dash_a" });
    await registerUser(b, { email: "dash-b@example.com", username: "dash_b" });
    await seedSession(a, userA.id, new Date(), 55);

    const resB = await b.get("/api/v1/dashboard/summary");
    expect(resB.body.postureScoreTrend).toHaveLength(0);
    expect(resB.body.recentSessions).toHaveLength(0);
  });
});
