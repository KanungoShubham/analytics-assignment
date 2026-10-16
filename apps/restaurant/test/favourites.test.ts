import { describe, it, expect, vi } from 'vitest';
import { fetchFavourites } from '../src/lib/favourites';

const profile = (favourites: { itemId: string; name: string; score: number }[]) =>
  new Response(JSON.stringify({ visits: 3, lastSeen: '2026-10-16T10:00:00.000Z', favourites }), { status: 200 });
const opts = (fetchImpl: unknown) => ({ endpoint: 'http://analytics.test', secretKey: 'sk_test', fetch: fetchImpl as typeof fetch, timeoutMs: 50 });

describe('fetchFavourites', () => {
  it('asks the analytics profile API with the secret key and returns known menu items', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => profile([
      { itemId: 'margherita', name: 'Margherita Pizza', score: 4 },
      { itemId: 'discontinued-dish', name: 'Old', score: 2 },
    ]));
    const result = await fetchFavourites({ anonymousId: 'anon_1', userId: 'user_asha' }, opts(f));
    expect(result).toEqual({ visits: 3, items: ['margherita'] });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://analytics.test/api/profile?anonymousId=anon_1&userId=user_asha');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer sk_test');
  });

  it('returns nothing (and never throws) when analytics is down or slow', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await fetchFavourites({ anonymousId: 'anon_1' }, opts(down))).toEqual({ visits: 0, items: [] });

    const slow = (_url: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))));
    expect(await fetchFavourites({ anonymousId: 'anon_1' }, opts(slow))).toEqual({ visits: 0, items: [] });
  });

  it('skips the call without an id', async () => {
    const f = vi.fn();
    expect(await fetchFavourites({}, opts(f))).toEqual({ visits: 0, items: [] });
    expect(f).not.toHaveBeenCalled();
  });
});
