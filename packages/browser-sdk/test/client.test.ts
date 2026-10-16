import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsClient, type BrowserConfig } from '../src/client';
import * as sdk from '../src/index';

type FetchMock = ReturnType<typeof vi.fn>;
const ok = () => vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 202 }));
const sent = (f: FetchMock, call = 0) => JSON.parse((f.mock.calls[call][1] as RequestInit).body as string);
let client: AnalyticsClient | null = null;

function makeClient(fetchImpl: FetchMock, over: Partial<BrowserConfig> = {}) {
  client = new AnalyticsClient({
    publicKey: 'pk_test',
    endpoint: 'http://analytics.test/',
    flushInterval: 100,
    maxBatchSize: 20,
    autoPageViews: false,
    fetch: fetchImpl as unknown as typeof fetch,
    ...over,
  });
  client.start();
  return client;
}

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'acme_anon_id=; Max-Age=0; Path=/';
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0); // no jitter
});
afterEach(() => {
  client?.stop();
  client = null;
  sdk.__resetForTests();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
});

describe('AnalyticsClient', () => {
  it('batches events and sends them on the flush interval', async () => {
    const f = ok();
    const c = makeClient(f);
    c.track('add_to_cart', { item: 'Pizza' });
    c.track('checkout_started');
    expect(f).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe('http://analytics.test/api/collect');
    const body = sent(f);
    expect(body.publicKey).toBe('pk_test');
    expect(body.events.map((e: { name: string }) => e.name)).toEqual(['add_to_cart', 'checkout_started']);
    expect(body.events[0]).toMatchObject({ type: 'track', properties: { item: 'Pizza' } });
    expect(body.events[0].anonymous_id).toMatch(/^anon_/);
    expect(body.events[0].session_id).toMatch(/^sess_/);
    expect(JSON.parse(localStorage.getItem('acme_queue')!)).toEqual([]);
  });

  it('flushes immediately when maxBatchSize is reached', () => {
    const f = ok();
    const c = makeClient(f, { maxBatchSize: 3 });
    c.track('a');
    c.track('b');
    expect(f).not.toHaveBeenCalled();
    c.track('c');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('retries with backoff after a network error and keeps the same events', async () => {
    const f = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response('{}', { status: 202 }));
    const c = makeClient(f);
    c.track('a');
    await vi.advanceTimersByTimeAsync(100);
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500); // backoff is 1000 ms
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(600);
    expect(f).toHaveBeenCalledTimes(2);
    expect(sent(f, 1).events[0].event_id).toBe(sent(f, 0).events[0].event_id);
  });

  it('retries on 503 and 429', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValue(new Response('{}', { status: 202 }));
    const c = makeClient(f);
    c.track('a');
    await vi.advanceTimersByTimeAsync(5000);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('drops batch on 4xx instead of retrying forever', async () => {
    const f = vi.fn(async () => new Response('{"error":"Origin not allowed"}', { status: 403 }));
    const c = makeClient(f);
    c.track('a');
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('acme_queue')!)).toEqual([]);
  });

  it('keeps unsent events across a page reload and sends them on start', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('offline');
    });
    makeClient(failing).track('before_reload');
    await vi.advanceTimersByTimeAsync(100);
    client!.stop();

    const f = ok();
    makeClient(f);
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(1);
    expect(sent(f).events[0].name).toBe('before_reload');
  });

  it('uses sendBeacon on pagehide and keeps events queued until confirmed', () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    const c = makeClient(vi.fn(() => new Promise<Response>(() => {})));
    c.track('leaving');
    window.dispatchEvent(new Event('pagehide'));
    expect(beacon).toHaveBeenCalledTimes(1);
    expect((beacon.mock.calls[0] as unknown[])[0]).toBe('http://analytics.test/api/collect');
    expect(JSON.parse(localStorage.getItem('acme_queue')!)).toHaveLength(1);
  });

  it('adds user_id after identify and removes it after reset', async () => {
    const f = ok();
    const c = makeClient(f);
    c.identify('user_42', { name: 'Asha' });
    c.track('after_login');
    c.reset();
    c.track('after_logout');
    await vi.advanceTimersByTimeAsync(100);
    const [identify, afterLogin, afterLogout] = sent(f).events;
    expect(identify).toMatchObject({ type: 'identify', user_id: 'user_42', properties: { name: 'Asha' } });
    expect(afterLogin.user_id).toBe('user_42');
    expect(afterLogout.user_id).toBeNull();
    expect(afterLogout.anonymous_id).not.toBe(afterLogin.anonymous_id);
  });

  it('tracks page views automatically on start and on client-side navigation', async () => {
    const f = ok();
    makeClient(f, { autoPageViews: true });
    history.pushState({}, '', '/menu');
    history.replaceState({}, '', '/menu'); // same path: no duplicate
    await vi.advanceTimersByTimeAsync(100);
    const events = sent(f).events;
    expect(events.map((e: { type: string; url: string }) => [e.type, e.url])).toEqual([['page_view', '/'], ['page_view', '/menu']]);
    expect(events[1].referrer).toBe('http://localhost:3000/');
    history.replaceState({}, '', '/');
  });

  it('does nothing when opted out or Do Not Track is on', async () => {
    const f = ok();
    const c = makeClient(f);
    c.optOut();
    c.track('ignored');
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    c.optIn();
    c.track('ignored_too');
    await vi.advanceTimersByTimeAsync(1000);
    expect(f).not.toHaveBeenCalled();
  });

  it('works when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const f = ok();
    const c = makeClient(f);
    c.track('still_works');
    await vi.advanceTimersByTimeAsync(100);
    expect(sent(f).events[0].name).toBe('still_works');
  });
});

describe('onEvent hook', () => {
  it('reports each queued event and survives a throwing callback', async () => {
    const seen: string[] = [];
    const f = ok();
    const c = makeClient(f, {
      onEvent: (e) => {
        seen.push(e.name);
        throw new Error('ui bug');
      },
    });
    c.track('add_to_cart');
    c.identify('user_1');
    expect(seen).toEqual(['add_to_cart', 'identify']);
    await vi.advanceTimersByTimeAsync(100);
    expect(sent(f).events).toHaveLength(2);
  });
});

describe('storage and size edge cases', () => {
  it('keeps user and session when only localStorage writes fail (quota exceeded)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const f = ok();
    const c = makeClient(f);
    c.identify('user_42');
    c.track('a');
    c.track('b');
    await vi.advanceTimersByTimeAsync(100);
    const [, a, b] = sent(f).events;
    expect(a.user_id).toBe('user_42');
    expect(b.session_id).toBe(a.session_id);
  });

  it('limits each request by UTF-8 bytes, not characters', async () => {
    const f = ok();
    const c = makeClient(f, { maxBatchSize: 20 });
    const text = '漢'.repeat(2500); // 2,500 chars but 7,500 bytes
    for (let i = 0; i < 20; i++) c.track('note', { text });
    await vi.advanceTimersByTimeAsync(0);
    const body = (f.mock.calls[0][1] as RequestInit).body as string;
    expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(64 * 1024);
  });
});

describe('public API', () => {
  it('never throws, even before init or when fetch throws synchronously', async () => {
    expect(() => sdk.track('before_init')).not.toThrow();
    expect(sdk.getAnonymousId()).toBeNull();
    sdk.init({
      publicKey: 'pk',
      endpoint: 'http://a.test',
      autoPageViews: false,
      fetch: (() => {
        throw new Error('boom');
      }) as unknown as typeof fetch,
    });
    expect(() => sdk.track('x')).not.toThrow();
    await expect(sdk.flush()).resolves.toBeUndefined();
    expect(sdk.getAnonymousId()).toMatch(/^anon_/);
  });
});
