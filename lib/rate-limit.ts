type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

function now() {
  return Date.now();
}

/**
 * Simple in-memory token-bucket rate limiter.
 * Suitable for single-instance self-hosted Node (PM2). Not distributed.
 * @param key unique bucket key (e.g. `ip:/api/leads`)
 * @param limit max hits per window
 * @param windowMs window duration in ms
 * @returns true if allowed, false if rate-limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const entry = store.get(key);
  const t = now();
  if (!entry || t > entry.resetAt) {
    store.set(key, { count: 1, resetAt: t + windowMs });
    return true;
  }
  if (entry.count < limit) {
    entry.count += 1;
    return true;
  }
  return false;
}

/**
 * Get client IP from request headers (x-forwarded-for aware).
 */
export function getClientIp(request: Request): string {
  const h = (request as unknown as { headers: Headers }).headers;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// Periodic cleanup of stale buckets (prevent memory leak) — run lazily
let lastCleanup = 0;
export function cleanupIfNeeded() {
  const t = now();
  if (t - lastCleanup < 60_000) return;
  lastCleanup = t;
  for (const [k, v] of store) {
    if (t > v.resetAt) store.delete(k);
  }
}
