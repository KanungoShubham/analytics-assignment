export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; retryAfterSec: number };
}

/** Fixed-window counter kept in memory. Per process only — use Redis when running several servers. */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();

  function prune(now: number) {
    for (const [key, w] of windows) if (now - w.start >= windowMs) windows.delete(key);
  }

  return {
    check(key, now = Date.now()) {
      let w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        w = { start: now, count: 0 };
        windows.set(key, w);
        if (windows.size > 10_000) prune(now);
      }
      w.count++;
      if (w.count > limit) {
        return { allowed: false, retryAfterSec: Math.ceil((w.start + windowMs - now) / 1000) };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}
