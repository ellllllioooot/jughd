// Fixed-window in-memory limiter. Single-VPS deployment (research.md §9), so a
// Map is enough; restarts just reset counters.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export function rateLimitHeaders(key: string): Record<string, string> {
  const entry = hits.get(key);
  return entry ? { "X-RateLimit-Remaining": String(Math.max(0, 5 - entry.count)) } : {};
}

/** Test-only: clear all counters. */
export function resetRateLimits() {
  hits.clear();
}
