import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { prisma } from "./prisma";
import { ApiError } from "./errors";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  tier: "FREE" | "PRO";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const COOKIE = "sid";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cookie value is `<sessionId>.<raw token>`; only the token's hash is stored. */
export function makeCookieValue(sessionId: string): { cookie: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { cookie: `${sessionId}.${token}`, tokenHash: hashToken(token) };
}

export function parseCookieValue(raw: string): { tokenHash: string } | null {
  const idx = raw.indexOf(".");
  if (idx <= 0) return null;
  return { tokenHash: hashToken(raw.slice(idx + 1)) };
}

export function setSessionCookie(res: Response, value: string) {
  res.cookie(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const raw = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1);
    if (!raw) throw new ApiError(401, "UNAUTHORIZED", "authentication required");
    const parsed = parseCookieValue(decodeURIComponent(raw));
    if (!parsed) throw new ApiError(401, "UNAUTHORIZED", "authentication required");

    const session = await prisma.authSession.findUnique({
      where: { tokenHash: parsed.tokenHash },
      include: { user: true },
    });
    const now = new Date();
    if (!session || session.expiresAt <= now) {
      throw new ApiError(401, "UNAUTHORIZED", "authentication required");
    }

    // sliding expiry, absolute cap
    const cap = new Date(session.createdAt.getTime() + config.sessionAbsoluteSec * 1000);
    const slide = new Date(now.getTime() + config.sessionSlidingSec * 1000);
    const nextExpiry = slide > cap ? cap : slide;
    if (nextExpiry.getTime() !== session.expiresAt.getTime()) {
      await prisma.authSession.update({
        where: { id: session.id },
        data: { expiresAt: nextExpiry },
      });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      tier: session.user.tier,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export { COOKIE as SESSION_COOKIE, timingSafeEqual };
