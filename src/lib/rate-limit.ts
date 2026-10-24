/**
 * In-memory fixed-window rate limiter (server instance scoped).
 *
 * V1 strategy per the API spec: no external infra. A shared store can replace
 * this later without changing call sites. Extracted from the submission route
 * so every public endpoint applies the same protection.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > MAX_TRACKED_KEYS) {
      for (const [k, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(k);
      }
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Best-effort client IP: XFF first hop when behind a proxy, else real IP. */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}