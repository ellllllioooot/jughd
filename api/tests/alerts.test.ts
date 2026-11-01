import { beforeEach, describe, expect, it } from "vitest";
import type { Agent } from "supertest";
import {
  fakeLandmarks,
  newAgent,
  registerUser,
  resetDb,
} from "./helpers";

beforeEach(resetDb);

async function makeSession(agent: Agent) {
  const baseline = await agent
    .post("/api/v1/baselines")
    .send({ landmarks: fakeLandmarks(), torsoScale: 0.3 });
  const created = await agent
    .post("/api/v1/sessions")
    .send({ baselineId: baseline.body.baseline.id });
  return created.body.session.id as string;
}

function alertPayload(clientKey: string, offsetSec = 0) {
  return {
    clientKey,
    category: "NECK",
    occurredAt: new Date(Date.now() + offsetSec * 1000).toISOString(),
    landmarksSnapshot: fakeLandmarks(),
  };
}

describe("alerts & verdicts (contracts/api.md, FR-007/FR-017)", () => {
  it("upserts idempotently: replayed batches return the same ids (research §10)", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const sessionId = await makeSession(agent);
    const key1 = crypto.randomUUID();
    const key2 = crypto.randomUUID();
    const batch = { alerts: [alertPayload(key1), alertPayload(key2)] };

    const first = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send(batch);
    expect(first.status).toBe(200);
    expect(first.body.stored).toBe(2);

    const replay = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send(batch);
    expect(replay.status).toBe(200);
    expect(replay.body.stored).toBe(0);
    expect(replay.body.ids).toEqual(first.body.ids);
  });

  it("verdicts are terminal: conflicting repeat → 409 ALREADY_VERIFIED, same → 200", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const sessionId = await makeSession(agent);
    const key = crypto.randomUUID();
    const created = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [alertPayload(key)],
    });
    const alertId = created.body.ids[key];

    const real = await agent.patch(`/api/v1/alerts/${alertId}/verdict`).send({ verdict: "REAL" });
    expect(real.status).toBe(200);
    expect(real.body.alert.verdict).toBe("REAL");
    expect(real.body.alert.verdictAt).toBeTruthy();

    const again = await agent.patch(`/api/v1/alerts/${alertId}/verdict`).send({ verdict: "REAL" });
    expect(again.status).toBe(200);

    const conflict = await agent
      .patch(`/api/v1/alerts/${alertId}/verdict`)
      .send({ verdict: "FALSE" });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("ALREADY_VERIFIED");
  });

  it("isolates owners on verdicts and alert writes", async () => {
    const a = newAgent();
    const b = newAgent();
    await registerUser(a, { email: "alert-a@example.com", username: "alert_a" });
    await registerUser(b, { email: "alert-b@example.com", username: "alert_b" });
    const sessionId = await makeSession(a);
    const key = crypto.randomUUID();
    const created = await a.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [alertPayload(key)],
    });
    const alertId = created.body.ids[key];

    const verdict = await b.patch(`/api/v1/alerts/${alertId}/verdict`).send({ verdict: "REAL" });
    expect(verdict.status).toBe(404);

    const write = await b.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [alertPayload(crypto.randomUUID())],
    });
    expect(write.status).toBe(404);

    // reuse of another user's clientKey must not leak ids
    const spoof = await b.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [alertPayload(key)],
    });
    expect(spoof.status).toBe(404);
  });

  it("rejects landmark snapshots that are not finite numbers (privacy invariant)", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const sessionId = await makeSession(agent);

    const withBlob = alertPayload(crypto.randomUUID());
    (withBlob.landmarksSnapshot[0] as unknown as { image: string }).image =
      "data:image/png;base64,AAAA";
    const blobRes = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [withBlob],
    });
    expect(blobRes.status).toBe(400);
    expect(blobRes.body.error.code).toBe("VALIDATION_ERROR");

    const withNaN = alertPayload(crypto.randomUUID());
    withNaN.landmarksSnapshot[0].x = Number.NaN;
    const nanRes = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [withNaN],
    });
    expect(nanRes.status).toBe(400);

    const withString = alertPayload(crypto.randomUUID());
    (withString.landmarksSnapshot[0] as unknown as { x: string }).x = "0.5";
    const strRes = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [withString],
    });
    expect(strRes.status).toBe(400);
  });

  it("validates occurredAt against the session window (client clock)", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const sessionId = await makeSession(agent);
    const res = await agent.post(`/api/v1/sessions/${sessionId}/alerts`).send({
      alerts: [alertPayload(crypto.randomUUID(), -3600)], // an hour before the session
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("answers malformed alert ids with 4xx, not 500 (T056 finding)", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const res = await agent
      .patch("/api/v1/alerts/not-a-uuid/verdict")
      .send({ verdict: "REAL" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
