import { Router } from "express";
import { loginSchema, registerSchema } from "../lib/validation";
import { ApiError } from "../lib/errors";
import { rateLimit } from "../lib/ratelimit";
import { clearSessionCookie, requireAuth, setSessionCookie } from "../lib/session";
import { prisma } from "../lib/prisma";
import {
  authenticate,
  createAuthSession,
  publicUser,
  registerUser,
  revokeAuthSession,
} from "../services/auth-service";
import { getQuota, quotaView } from "../services/quota-service";

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);
    const cookie = await createAuthSession(user.id);
    setSessionCookie(res, cookie);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    // rate-limited per IP + per account
    const ip = req.ip ?? "unknown";
    if (!rateLimit(`login:ip:${ip}`, 10, 60_000) || !rateLimit(`login:acct:${input.emailOrUsername}`, 5, 60_000)) {
      throw new ApiError(429, "RATE_LIMITED", "too many login attempts, try again later");
    }
    const user = await authenticate(input);
    const cookie = await createAuthSession(user.id);
    setSessionCookie(res, cookie);
    res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const raw = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("sid="))
      ?.slice(4);
    if (raw) await revokeAuthSession(decodeURIComponent(raw));
    clearSessionCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const quota = await getQuota(req.user!.id);
    const full = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({ user: publicUser(full), quota: quotaView(quota) });
  } catch (err) {
    next(err);
  }
});
