export interface Config {
  databaseUrl: string;
  sessionSecret: string;
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  vapidSubject: string;
  freeMonthlySeconds: number;
  sessionSlidingSec: number;
  sessionAbsoluteSec: number;
}

function fail(msg: string): never {
  throw new Error(`config error: ${msg}`);
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) fail(`${name} must be a positive integer`);
  return n;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) fail("DATABASE_URL is required");
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 16)
    fail("SESSION_SECRET is required and must be ≥16 chars");

  const pub = process.env.VAPID_PUBLIC_KEY || null;
  const priv = process.env.VAPID_PRIVATE_KEY || null;
  if ((pub === null) !== (priv === null))
    fail("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set together");

  return {
    databaseUrl,
    sessionSecret,
    vapidPublicKey: pub,
    vapidPrivateKey: priv,
    vapidSubject: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    freeMonthlySeconds: intEnv("FREE_MONTHLY_SECONDS", 43200), // 12h default
    sessionSlidingSec: intEnv("SESSION_SLIDING_SEC", 7 * 24 * 3600),
    sessionAbsoluteSec: intEnv("SESSION_ABSOLUTE_SEC", 30 * 24 * 3600),
  };
}

export const config = loadConfig();
