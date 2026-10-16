import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestDb } from './helpers';
import { handleCollect, handleServerEvents } from '../src/lib/ingest-handlers';
import { createRateLimiter } from '../src/lib/rate-limit';

const ORIGIN = 'http://localhost:3001';
const event = (over: Record<string, unknown> = {}) => ({
  event_id: randomUUID(), type: 'page_view', name: 'page_view', anonymous_id: 'anon_1',
  session_id: 'sess_1', timestamp: new Date().toISOString(), url: '/', ...over,
});
const limiter = () => createRateLimiter({ limit: 100, windowMs: 60_000 });
const collect = (body: unknown, headers: Record<string, string> = { origin: ORIGIN }) =>
  new Request('http://localhost:3000/api/collect', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/collect', () => {
  it('accepts a batch from an allowed origin and echoes CORS', async () => {
    const res = await handleCollect(collect({ publicKey: 'pk_test', events: [event(), event()] }), createTestDb(), limiter());
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: 2, duplicates: 0, rejected: [] });
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });
  it('accepts the key in the X-Analytics-Key header', async () => {
    const res = await handleCollect(collect({ events: [event()] }, { origin: ORIGIN, 'x-analytics-key': 'pk_test' }), createTestDb(), limiter());
    expect(res.status).toBe(202);
  });
  it('401 for an unknown public key', async () => {
    const res = await handleCollect(collect({ publicKey: 'pk_wrong', events: [event()] }), createTestDb(), limiter());
    expect(res.status).toBe(401);
  });
  it('403 for a disallowed or missing origin, and keeps CORS header so the SDK can read it', async () => {
    const bad = await handleCollect(collect({ publicKey: 'pk_test', events: [event()] }, { origin: 'https://evil.example' }), createTestDb(), limiter());
    expect(bad.status).toBe(403);
    expect(bad.headers.get('access-control-allow-origin')).toBe('https://evil.example');
    const none = await handleCollect(collect({ publicKey: 'pk_test', events: [event()] }, {}), createTestDb(), limiter());
    expect(none.status).toBe(403);
  });
  it('400 for invalid JSON or empty batch', async () => {
    expect((await handleCollect(collect('{oops'), createTestDb(), limiter())).status).toBe(400);
    expect((await handleCollect(collect({ publicKey: 'pk_test', events: [] }), createTestDb(), limiter())).status).toBe(400);
  });
  it('413 for a body over 64 KB', async () => {
    const big = { publicKey: 'pk_test', events: [event({ title: 'x'.repeat(70_000) })] };
    expect((await handleCollect(collect(big), createTestDb(), limiter())).status).toBe(413);
  });
  it('429 when rate limited', async () => {
    const db = createTestDb();
    const tight = createRateLimiter({ limit: 1, windowMs: 60_000 });
    await handleCollect(collect({ publicKey: 'pk_test', events: [event()] }), db, tight);
    const res = await handleCollect(collect({ publicKey: 'pk_test', events: [event()] }), db, tight);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBeTruthy();
  });
});

describe('POST /api/server-events', () => {
  const serverReq = (auth?: string) =>
    new Request('http://localhost:3000/api/server-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
      body: JSON.stringify({ events: [event({ type: 'track', name: 'order_created', properties: { total: 10 } })] }),
    });
  it('401 without a valid secret key (public key is not enough)', async () => {
    expect((await handleServerEvents(serverReq(), createTestDb(), limiter())).status).toBe(401);
    expect((await handleServerEvents(serverReq('Bearer pk_test'), createTestDb(), limiter())).status).toBe(401);
  });
  it('202 with the secret key and stores source=server', async () => {
    const db = createTestDb();
    const res = await handleServerEvents(serverReq('Bearer sk_test'), db, limiter());
    expect(res.status).toBe(202);
    expect((db.prepare('SELECT source FROM events').get() as { source: string }).source).toBe('server');
  });
});
