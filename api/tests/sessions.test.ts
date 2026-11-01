import { beforeEach, describe, expect, it } from "vitest";
import type { Agent } from "supertest";
import {
  fakeLandmarks,
  newAgent,
  prisma,
  registerUser,
  resetDb,
} from "./helpers";

beforeEach(resetDb);

async function makeBaseline(agent: Agent, torsoScale = 0.3) {
  const res = await agent
    .post("/api/v1/baselines")
    .send({ landmarks: fakeLandmarks(), torsoScale });
  expect(res.status).toBe(201);
  return res.body.baseline as { id: string };
}

describe("baselines (contracts/api.md)", () => {
  it("current baseline = latest per user", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const first = await makeBaseline(agent, 0.3);
    await new Promise((r) => setTimeout(r, 5));
    const second = await makeBaseline(agent, 0.31);
    const res = await agent.get("/api/v1/baselines/current");
    expect(res.status).toBe(200);
    expect(res.body.baseline.id).toBe(second.id);
    expect(res.body.baseline.id).not.toBe(first.id);
  });

  it("returns 404 NO_BASELINE before any calibration", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const res = await agent.get("/api/v1/baselines/current");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NO_BASELINE");
  });

  it("rejects non-numeric landmark payloads (privacy invariant)", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const bad = fakeLandmarks();
    (bad[0] as unknown as { blob: string }).blob = "data:image/png;base64,AAAA";
    const res = await agent.post("/api/v1/baselines").send({ landmarks: bad, torsoScale: 0.3 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("sessions (contracts/api.md)", () => {
  it("creates a session and clamps end writes (0 ≤ durationSec ≤ wall time + 5%)", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const baseline = await makeBaseline(agent);
    const created = await agent.post("/api/v1/sessions").send({ baselineId: baseline.id });
    expect(created.status).toBe(201);
    const session = created.body.session;
    expect(session.status).toBe("ACTIVE");

    const end = await agent.patch(`/api/v1/sessions/${session.id}/end`).send({
      endedAt: new Date().toISOString(),
      durationSec: 99_999, // absurd vs ~1s elapsed
      postureScore: 150,
      alertCount: 0,
    });
    expect(end.status).toBe(200);
    expect(end.body.session.status).toBe("COMPLETED");
    expect(end.body.session.durationSec).toBeLessThanOrEqual(Math.ceil(1.05 * 120));
    expect(end.body.session.postureScore).toBe(100); // clamped
    expect(end.body.session.durationSec).toBeGreaterThanOrEqual(0);
  });

  it("clamps postureScore up from negative and rejects negative durationSec", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const baseline = await makeBaseline(agent);
    const created = await agent.post("/api/v1/sessions").send({ baselineId: baseline.id });
    const id = created.body.session.id;

    const neg = await agent.patch(`/api/v1/sessions/${id}/end`).send({
      endedAt: new Date().toISOString(),
      durationSec: -5,
      postureScore: 50,
      alertCount: 0,
    });
    expect(neg.status).toBe(400);

    const ok = await agent.patch(`/api/v1/sessions/${id}/end`).send({
      endedAt: new Date().toISOString(),
      durationSec: 0,
      postureScore: -30,
      alertCount: 0,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.session.postureScore).toBe(0);
  });

  it("isolates owners: other users get 404 on read and end", async () => {
    const a = newAgent();
    const b = newAgent();
    await registerUser(a, { email: "a@example.com", username: "user_a" });
    await registerUser(b, { email: "b@example.com", username: "user_b" });
    const baseline = await makeBaseline(a);
    const created = await a.post("/api/v1/sessions").send({ baselineId: baseline.id });
    const id = created.body.session.id;

    const read = await b.get(`/api/v1/sessions/${id}`);
    expect(read.status).toBe(404);
    const end = await b.patch(`/api/v1/sessions/${id}/end`).send({
      endedAt: new Date().toISOString(),
      durationSec: 1,
      postureScore: 50,
      alertCount: 0,
    });
    expect(end.status).toBe(404);

    const list = await b.get("/api/v1/sessions");
    expect(list.body.items).toHaveLength(0);
  });

  it("rejects session creation with someone else's baseline", async () => {
    const a = newAgent();
    const b = newAgent();
    await registerUser(a, { email: "a2@example.com", username: "user_a2" });
    await registerUser(b, { email: "b2@example.com", username: "user_b2" });
    const baseline = await makeBaseline(a);
    const res = await b.post("/api/v1/sessions").send({ baselineId: baseline.id });
    expect(res.status).toBe(404);
  });

  it("quota sums month sessions: exhausted users cannot start sessions", async () => {
    const agent = newAgent();
    const user = await registerUser(agent);
    const baseline = await makeBaseline(agent);
    // seed a completed session consuming the whole 12h allowance
    await prisma.monitoringSession.create({
      data: {
        userId: user.id,
        baselineId: baseline.id,
        status: "COMPLETED",
        durationSec: 43_200,
        endedAt: new Date(),
        postureScore: 90,
      },
    });
    const quota = await agent.get("/api/v1/quota");
    expect(quota.body).toMatchObject({ usedSeconds: 43_200, limitSeconds: 43_200, exhausted: true });

    const res = await agent.post("/api/v1/sessions").send({ baselineId: baseline.id });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("QUOTA_EXHAUSTED");
  });
});
