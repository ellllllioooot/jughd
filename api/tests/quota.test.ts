import { beforeEach, describe, expect, it } from "vitest";
import type { Agent } from "supertest";
import { fakeLandmarks, newAgent, prisma, registerUser, resetDb } from "./helpers";

beforeEach(resetDb);

async function seedBaseline(agent: Agent) {
  const res = await agent
    .post("/api/v1/baselines")
    .send({ landmarks: fakeLandmarks(), torsoScale: 0.3 });
  return res.body.baseline.id as string;
}

async function seedSession(
  userId: string,
  baselineId: string,
  startedAt: Date,
  durationSec: number
) {
  return prisma.monitoringSession.create({
    data: {
      userId,
      baselineId,
      startedAt,
      endedAt: startedAt,
      durationSec,
      status: "COMPLETED",
      postureScore: 80,
    },
  });
}

describe("monthly quota (SC-005, contracts/api.md GET /quota)", () => {
  it("sums only the current calendar month (month boundary + partial month)", async () => {
    const agent = newAgent();
    const user = await registerUser(agent);
    const baselineId = await seedBaseline(agent);
    const now = new Date();
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12));
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2, 12));
    await seedSession(user.id, baselineId, prevMonth, 5000); // previous month — must not count
    await seedSession(user.id, baselineId, thisMonth, 3000);
    await seedSession(user.id, baselineId, thisMonth, 2000);

    const res = await agent.get("/api/v1/quota");
    expect(res.status).toBe(200);
    expect(res.body.usedSeconds).toBe(5000);
    expect(res.body.limitSeconds).toBe(43200); // 12h FREE default
    expect(res.body.exhausted).toBe(false);
    expect(res.body.periodStart).toBe(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    );
    expect(res.body.periodEnd).toBe(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
    );
  });

  it("blocks new sessions with QUOTA_EXHAUSTED at zero remaining", async () => {
    const agent = newAgent();
    const user = await registerUser(agent);
    const baselineId = await seedBaseline(agent);
    await seedSession(user.id, baselineId, new Date(), 43200);

    const quota = await agent.get("/api/v1/quota");
    expect(quota.body.exhausted).toBe(true);

    const res = await agent.post("/api/v1/sessions").send({ baselineId });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("QUOTA_EXHAUSTED");
  });

  it("applies the configured tier limit (PRO is 10x FREE)", async () => {
    const agent = newAgent();
    const user = await registerUser(agent);
    const baselineId = await seedBaseline(agent);
    await seedSession(user.id, baselineId, new Date(), 50_000); // exhausts FREE, fits PRO

    const free = await agent.get("/api/v1/quota");
    expect(free.body.exhausted).toBe(true);

    await prisma.user.update({ where: { id: user.id }, data: { tier: "PRO" } });
    const pro = await agent.get("/api/v1/quota");
    expect(pro.body.limitSeconds).toBe(432_000);
    expect(pro.body.exhausted).toBe(false);

    const res = await agent.post("/api/v1/sessions").send({ baselineId });
    expect(res.status).toBe(201);
  });
});
