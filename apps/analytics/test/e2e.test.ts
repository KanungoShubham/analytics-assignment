// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { AnalyticsClient } from '@acme/browser-sdk';
import { ServerAnalytics } from '@acme/server-sdk';
import { createTestDb } from './helpers';
import { handleCollect, handleServerEvents } from '../src/lib/ingest-handlers';
import { createRateLimiter } from '../src/lib/rate-limit';
import { getOverview, getTopPages } from '../src/lib/stats';

describe('end to end: SDKs → ingestion → stats', () => {
  it('a visit, a custom event and a server-side order show up in the stats', async () => {
    localStorage.clear();
    const db = createTestDb();
    const limiter = createRateLimiter({ limit: 100, windowMs: 60_000 });

    // Route SDK requests straight into the real handlers (the browser would add the Origin header).
    const browserFetch = (async (url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      headers.set('origin', 'http://localhost:3001');
      return handleCollect(new Request(url, { ...init, headers }), db, limiter);
    }) as unknown as typeof fetch;
    const serverFetch = (async (url: string, init: RequestInit) => handleServerEvents(new Request(url, init), db, limiter)) as unknown as typeof fetch;

    const browser = new AnalyticsClient({ publicKey: 'pk_test', endpoint: 'http://localhost:3000', autoPageViews: false, fetch: browserFetch });
    browser.page();
    browser.track('add_to_cart', { itemId: 'margherita' });
    await browser.flush();

    const server = new ServerAnalytics({ secretKey: 'sk_test', endpoint: 'http://localhost:3000', fetch: serverFetch });
    const result = await server.track('order_created', { orderId: 'ord_1', total: 12.5 }, { anonymousId: browser.getAnonymousId() });
    expect(result.ok).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    const range = { from: today, to: today };
    expect(getOverview(db, 'demo', range)).toEqual({ pageViews: 1, uniqueVisitors: 1, sessions: 1, events: 2, orders: 1, revenue: 12.5 });
    expect(getTopPages(db, 'demo', range, 10)).toEqual([{ url: '/', views: 1, uniqueVisitors: 1 }]);

    const ids = db.prepare('SELECT DISTINCT anonymous_id FROM events').all();
    expect(ids).toHaveLength(1); // the order is linked to the same visitor
  });
});
