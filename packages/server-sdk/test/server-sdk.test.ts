import { describe, it, expect, vi } from 'vitest';
import { ServerAnalytics } from '../src';

const logger = { warn: vi.fn() };
const make = (fetchImpl: unknown, over = {}) =>
  new ServerAnalytics({ secretKey: 'sk_test', endpoint: 'http://analytics.test/', retryDelayMs: 1, logger, fetch: fetchImpl as typeof fetch, ...over });
const accepted = () => new Response(JSON.stringify({ accepted: 1, duplicates: 0, rejected: [] }), { status: 202 });

describe('ServerAnalytics', () => {
  it('sends the event with the secret key', async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => accepted());
    const res = await make(f).track('order_created', { total: 20 }, { anonymousId: 'anon_1', userId: 'user_1' });
    expect(res).toEqual({ ok: true, status: 202 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://analytics.test/api/server-events');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk_test');
    const event = JSON.parse(init.body as string).events[0];
    expect(event).toMatchObject({ type: 'track', name: 'order_created', anonymous_id: 'anon_1', user_id: 'user_1', properties: { total: 20 } });
    expect(event.event_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('retries on 5xx with the same event_id, then succeeds', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValue(accepted());
    expect((await make(f).track('order_created')).ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
    const id = (call: number) => JSON.parse((f.mock.calls[call][1] as RequestInit).body as string).events[0].event_id;
    expect(id(1)).toBe(id(0));
  });

  it('does not retry on 401', async () => {
    const f = vi.fn(async () => new Response('', { status: 401 }));
    expect(await make(f).track('order_created')).toEqual({ ok: false, status: 401, error: 'HTTP 401' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('times out slow requests', async () => {
    const hanging = (_url: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    const res = await make(hanging, { timeoutMs: 20, maxRetries: 0 }).track('order_created');
    expect(res).toEqual({ ok: false, error: 'timeout after 20 ms' });
  });

  it('never throws, even if fetch throws synchronously', async () => {
    const res = await make(() => {
      throw new Error('boom');
    }, { maxRetries: 0 }).track('order_created');
    expect(res.ok).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('reports events rejected by validation as not ok', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ accepted: 0, duplicates: 0, rejected: [{ index: 0, error: 'name: invalid' }] }), { status: 202 }));
    expect(await make(f).track('bad name')).toEqual({ ok: false, status: 202, error: 'name: invalid' });
  });
});
