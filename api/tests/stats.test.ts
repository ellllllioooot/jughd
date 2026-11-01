import { beforeEach, describe, expect, it } from "vitest";
import { fakeLandmarks, newAgent, prisma, registerUser, resetDb } from "./helpers";
import { resetGlobalStatsCache } from "../src/services/aggregate-service";

beforeEach(() => {
  resetDb();
  resetGlobalStatsCache();
});

describe("global stats (contracts/api.md GET /stats/global)", () => {
  it("returns anonymized platform totals only", async () => {
    const user = await registerUser(newAgent(), {
      email: "stats-a@example.com",
      username: "stats_a",
    });
    await registerUser(newAgent(), { email: "stats-b@example.com", username: "stats_b" });
    const baseline = await prisma.baseline.create({
      data: { userId: user.id, landmarks: fakeLandmarks(), torsoScale: 0.3 },
    });
    for (const durationSec of [600, 300]) {
      await prisma.monitoringSession.create({
        data: {
          userId: user.id,
          baselineId: baseline.id,
          startedAt: new Date(),
          endedAt: new Date(),
          durationSec,
          status: "COMPLETED",
          postureScore: 80,
        },
      });
    }
    await prisma.postureAlert.create({
      data: {
        clientKey: crypto.randomUUID(),
        userId: user.id,
        sessionId: (await prisma.monitoringSession.findFirstOrThrow()).id,
        category: "NECK",
        occurredAt: new Date(),
        landmarksSnapshot: fakeLandmarks(),
      },
    });

    const res = await newAgent().get("/api/v1/stats/global");
    expect(res.status).toBe(200);
    // exact shape — nothing user-identifying (privacy: anonymized totals only)
    expect(Object.keys(res.body).sort()).toEqual([
      "alerts",
      "monitoredHours",
      "sessions",
      "users",
    ]);
    expect(res.body.users).toBe(2);
    expect(res.body.sessions).toBe(2);
    expect(res.body.monitoredHours).toBe(900 / 3600);
    expect(res.body.alerts).toBe(1);
  });

  it("serves cached totals for 60 seconds", async () => {
    const user = await registerUser(newAgent(), {
      email: "stats-cache@example.com",
      username: "stats_cache",
    });
    const baseline = await prisma.baseline.create({
      data: { userId: user.id, landmarks: fakeLandmarks(), torsoScale: 0.3 },
    });

    const first = await newAgent().get("/api/v1/stats/global");
    expect(first.body.sessions).toBe(0);

    await prisma.monitoringSession.create({
      data: {
        userId: user.id,
        baselineId: baseline.id,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSec: 60,
        status: "COMPLETED",
        postureScore: 80,
      },
    });

    const cached = await newAgent().get("/api/v1/stats/global");
    expect(cached.body.sessions).toBe(0); // still the cached snapshot

    resetGlobalStatsCache();
    const fresh = await newAgent().get("/api/v1/stats/global");
    expect(fresh.body.sessions).toBe(1);
    expect(fresh.body.monitoredHours).toBe(60 / 3600);
  });
});
