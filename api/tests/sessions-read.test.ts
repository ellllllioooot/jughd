import { beforeEach, describe, expect, it } from "vitest";
import type { Agent } from "supertest";
import { fakeLandmarks, newAgent, registerUser, resetDb } from "./helpers";

beforeEach(resetDb);

async function makeEndedSession(agent: Agent, score: number) {
  const baseline = await agent
    .post("/api/v1/baselines")
    .send({ landmarks: fakeLandmarks(), torsoScale: 0.3 });
  const created = await agent
    .post("/api/v1/sessions")
    .send({ baselineId: baseline.body.baseline.id });
  const id = created.body.session.id as string;
  await agent.patch(`/api/v1/sessions/${id}/end`).send({
    endedAt: new Date().toISOString(),
    durationSec: 60,
    postureScore: score,
    alertCount: 0,
  });
  return id;
}

describe("session reads (contracts/api.md)", () => {
  it("paginates newest-first with opaque cursors", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const a = await makeEndedSession(agent, 80);
    await new Promise((r) => setTimeout(r, 5));
    const b = await makeEndedSession(agent, 90);
    await new Promise((r) => setTimeout(r, 5));
    const c = await makeEndedSession(agent, 70);

    const page1 = await agent.get("/api/v1/sessions?limit=2");
    expect(page1.status).toBe(200);
    expect(page1.body.items.map((s: { id: string }) => s.id)).toEqual([c, b]);
    expect(page1.body.nextCursor).toBeTruthy();

    const page2 = await agent.get(
      `/api/v1/sessions?limit=2&cursor=${encodeURIComponent(page1.body.nextCursor)}`
    );
    expect(page2.body.items.map((s: { id: string }) => s.id)).toEqual([a]);
    expect(page2.body.nextCursor).toBeNull();
  });

  it("detail lists alerts with verdict and landmarksSnapshot fields", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const sessionId = await makeEndedSession(agent, 85);
    const key = crypto.randomUUID();
    const posted = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [
        {
          clientKey: key,
          category: "SLOUCH",
          occurredAt: new Date().toISOString(),
          landmarksSnapshot: fakeLandmarks(),
        },
      ],
    });
    const alertId = posted.body.ids[key];
    await agent.patch(`/api/v1/alerts/${alertId}/verdict`).send({ verdict: "REAL" });

    const res = await agent.get(`/api/v1/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(sessionId);
    expect(res.body.alerts).toHaveLength(1);
    const alert = res.body.alerts[0];
    expect(alert.verdict).toBe("REAL");
    expect(alert.verdictAt).toBeTruthy();
    expect(alert.landmarksSnapshot).toHaveLength(33);
    expect(typeof alert.landmarksSnapshot[0].x).toBe("number");
  });

  it("hides other users' sessions behind 404", async () => {
    const a = newAgent();
    const b = newAgent();
    await registerUser(a, { email: "read-a@example.com", username: "read_a" });
    await registerUser(b, { email: "read-b@example.com", username: "read_b" });
    const id = await makeEndedSession(a, 75);
    expect((await b.get(`/api/v1/sessions/${id}`)).status).toBe(404);
    expect((await b.get("/api/v1/sessions")).body.items).toHaveLength(0);
  });
});
