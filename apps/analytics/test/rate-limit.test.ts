import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../src/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to the limit per window, then blocks with Retry-After', () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(rl.check('k', 0).allowed).toBe(true);
    expect(rl.check('k', 1000).allowed).toBe(true);
    expect(rl.check('k', 2000)).toEqual({ allowed: false, retryAfterSec: 58 });
    expect(rl.check('other', 2000).allowed).toBe(true);
  });
  it('resets after the window', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.check('k', 0);
    expect(rl.check('k', 60_000).allowed).toBe(true);
  });
});
