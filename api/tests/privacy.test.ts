import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { fakeLandmarks, newAgent, registerUser, resetDb } from "./helpers";

beforeEach(resetDb);

// Constitution I (NON-NEGOTIABLE): no image, video, or binary blob data is ever
// stored or accepted — landmarks are numeric tuples only (SC-008).
describe("privacy invariants (constitution I / SC-008)", () => {
  it("schema stores zero binary/blob columns", () => {
    const schema = readFileSync(
      new URL("../prisma/schema.prisma", import.meta.url),
      "utf8"
    );
    expect(schema).not.toMatch(/\bBytes\b/);
    expect(schema).not.toMatch(/bytea/i);
    expect(schema).not.toMatch(/data:image|base64/i);
  });

  it("baselines reject non-numeric landmark payloads", async () => {
    const agent = newAgent();
    await registerUser(agent);

    const stringCoord = fakeLandmarks();
    (stringCoord[0] as unknown as { x: string }).x = "0.5";
    const r1 = await agent
      .post("/api/v1/baselines")
      .send({ landmarks: stringCoord, torsoScale: 0.3 });
    expect(r1.status).toBe(400);
    expect(r1.body.error.code).toBe("VALIDATION_ERROR");

    const blobField = fakeLandmarks();
    (blobField[0] as unknown as { blob: string }).blob = "data:image/png;base64,AAAA";
    const r2 = await agent
      .post("/api/v1/baselines")
      .send({ landmarks: blobField, torsoScale: 0.3 });
    expect(r2.status).toBe(400); // strict schema: unknown keys rejected, not stripped
    expect(r2.body.error.code).toBe("VALIDATION_ERROR");

    const missingScore = fakeLandmarks().map((l) => ({ x: l.x, y: l.y, z: l.z }));
    const r3 = await agent
      .post("/api/v1/baselines")
      .send({ landmarks: missingScore, torsoScale: 0.3 });
    expect(r3.status).toBe(400);
    expect(r3.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("alert snapshots reject non-numeric and binary payloads", async () => {
    const agent = newAgent();
    await registerUser(agent);
    const baseline = await agent
      .post("/api/v1/baselines")
      .send({ landmarks: fakeLandmarks(), torsoScale: 0.3 });
    const created = await agent
      .post("/api/v1/sessions")
      .send({ baselineId: baseline.body.baseline.id });

    const badAlert = (mutate: (l: Record<string, unknown>) => void) => {
      const snapshot = fakeLandmarks().map((l) => ({ ...l }));
      mutate(snapshot[0]);
      return {
        clientKey: crypto.randomUUID(),
        category: "NECK",
        occurredAt: new Date().toISOString(),
        landmarksSnapshot: snapshot,
      };
    };

    const r1 = await agent
      .post(`/api/v1/sessions/${created.body.session.id}/alerts`)
      .send({ alerts: [badAlert((l) => (l.y = "abc"))] });
    expect(r1.status).toBe(400);
    expect(r1.body.error.code).toBe("VALIDATION_ERROR");

    const r2 = await agent
      .post(`/api/v1/sessions/${created.body.session.id}/alerts`)
      .send({ alerts: [badAlert((l) => (l.blob = "data:image/jpeg;base64,AAAA"))] });
    expect(r2.status).toBe(400);
    expect(r2.body.error.code).toBe("VALIDATION_ERROR");

    const r3 = await agent
      .post(`/api/v1/sessions/${created.body.session.id}/alerts`)
      .send({ alerts: [badAlert((l) => (l.x = null))] });
    expect(r3.status).toBe(400);
    expect(r3.body.error.code).toBe("VALIDATION_ERROR");
  });
});
