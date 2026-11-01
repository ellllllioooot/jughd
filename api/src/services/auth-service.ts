import { randomUUID } from "node:crypto";
import { config } from "../lib/config";
import { prisma } from "../lib/prisma";
import { makeCookieValue, parseCookieValue } from "../lib/session";
import { hashPassword, verifyPassword } from "../lib/password";
import { ApiError } from "../lib/errors";

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });
  if (existing?.email === input.email) {
    throw new ApiError(409, "EMAIL_TAKEN", "email already registered");
  }
  if (existing?.username === input.username) {
    throw new ApiError(409, "USERNAME_TAKEN", "username already taken");
  }
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
      },
    });
  } catch (err: unknown) {
    // unique-constraint race
    if ((err as { code?: string }).code === "P2002") {
      throw new ApiError(409, "EMAIL_TAKEN", "email or username already taken");
    }
    throw err;
  }
}

export async function authenticate(input: {
  emailOrUsername: string;
  password: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.emailOrUsername }, { username: input.emailOrUsername }],
    },
  });
  if (!user) {
    // burn comparable time so unknown accounts are not distinguishable
    await hashPassword(input.password);
    throw new ApiError(401, "INVALID_CREDENTIALS", "invalid email/username or password");
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "invalid email/username or password");
  }
  return user;
}

export async function createAuthSession(userId: string): Promise<string> {
  const id = randomUUID();
  const { cookie, tokenHash } = makeCookieValue(id);
  await prisma.authSession.create({
    data: {
      id,
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + config.sessionSlidingSec * 1000),
    },
  });
  return cookie;
}

export async function revokeAuthSession(cookieValue: string) {
  const parsed = parseCookieValue(cookieValue);
  if (!parsed) return;
  await prisma.authSession.deleteMany({ where: { tokenHash: parsed.tokenHash } });
}

export function publicUser(user: {
  id: string;
  email: string;
  username: string;
  tier: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    tier: user.tier,
    createdAt: user.createdAt.toISOString(),
  };
}
