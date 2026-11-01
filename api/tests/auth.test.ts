import { beforeEach, describe, expect, it } from "vitest";
import {
  app,
  newAgent,
  registerUser,
  resetDb,
  sidCookie,
} from "./helpers";
import request from "supertest";

beforeEach(resetDb);

describe("auth contract (contracts/api.md)", () => {
  it("registers, signs out, and signs back in (quickstart V1)", async () => {
    const agent = newAgent();
    const reg = await agent.post("/api/v1/auth/register").send({
      email: "Ana@Example.com",
      username: "ana_user",
      password: "password123",
    });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ email: "ana@example.com", username: "ana_user", tier: "FREE" });
    expect(sidCookie(reg)).toBeDefined();

    const out = await agent.post("/api/v1/auth/logout");
    expect(out.status).toBe(204);

    const me1 = await agent.get("/api/v1/auth/me");
    expect(me1.status).toBe(401);

    const login = await agent.post("/api/v1/auth/login").send({
      emailOrUsername: "ana_user",
      password: "password123",
    });
    expect(login.status).toBe(200);
    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe("ana_user");
    expect(me.body.quota).toMatchObject({
      usedSeconds: 0,
      limitSeconds: 43200,
      exhausted: false,
    });
    expect(me.body.quota.periodStart).toBeDefined();
    expect(me.body.quota.periodEnd).toBeDefined();
  });

  it("rejects duplicate email and username with distinct codes", async () => {
    const agent = newAgent();
    await registerUser(agent, { email: "dup@example.com", username: "dup_user" });
    const byEmail = await newAgent().post("/api/v1/auth/register").send({
      email: "dup@example.com",
      username: "other_name",
      password: "password123",
    });
    expect(byEmail.status).toBe(409);
    expect(byEmail.body.error.code).toBe("EMAIL_TAKEN");
    const byName = await newAgent().post("/api/v1/auth/register").send({
      email: "other@example.com",
      username: "dup_user",
      password: "password123",
    });
    expect(byName.status).toBe(409);
    expect(byName.body.error.code).toBe("USERNAME_TAKEN");
  });

  it("gives a generic 401 for wrong credentials and unknown accounts", async () => {
    const agent = newAgent();
    await registerUser(agent, { email: "known@example.com", username: "known_user" });
    const wrongPass = await newAgent().post("/api/v1/auth/login").send({
      emailOrUsername: "known@example.com",
      password: "wrong-password",
    });
    expect(wrongPass.status).toBe(401);
    expect(wrongPass.body.error.code).toBe("INVALID_CREDENTIALS");
    const unknown = await newAgent().post("/api/v1/auth/login").send({
      emailOrUsername: "ghost@example.com",
      password: "wrong-password",
    });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknown.body.error.message).toBe(wrongPass.body.error.message);
  });

  it("rate-limits login per IP/account", async () => {
    const agent = newAgent();
    await registerUser(agent, { email: "brute@example.com", username: "brute_user" });
    let sawLimit = false;
    for (let i = 0; i < 8; i++) {
      const res = await newAgent().post("/api/v1/auth/login").send({
        emailOrUsername: "brute@example.com",
        password: "wrong-password",
      });
      if (res.status === 429) {
        expect(res.body.error.code).toBe("RATE_LIMITED");
        sawLimit = true;
        break;
      }
    }
    expect(sawLimit).toBe(true);
  });

  it("never exposes passwordHash and sets hardened cookie flags", async () => {
    const agent = newAgent();
    const reg = await agent.post("/api/v1/auth/register").send({
      email: "safe@example.com",
      username: "safe_user",
      password: "password123",
    });
    expect(reg.text).not.toContain("passwordHash");
    const login = await newAgent().post("/api/v1/auth/login").send({
      emailOrUsername: "safe_user",
      password: "password123",
    });
    expect(login.text).not.toContain("passwordHash");
    const me = await agent.get("/api/v1/auth/me");
    expect(me.text).not.toContain("passwordHash");

    const cookie = (reg.headers["set-cookie"] as unknown as string[]).join(";");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("requires auth on protected routes", async () => {
    for (const path of ["/api/v1/auth/me", "/api/v1/quota", "/api/v1/sessions", "/api/v1/dashboard/summary"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    }
  });
});
