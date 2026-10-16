import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestDb } from './helpers';
import { ingestEvents } from '../src/lib/ingest';
import { getEventTrends, getOverview, getTimeseries, getTopPages, parseRange, InvalidRangeError } from '../src/lib/stats';
import type { DB } from '../src/lib/db';

const NOW = new Date('2026-10-16T12:00:00.000Z');
const pv = (anon: string, session: string, url: string, ts: string) => ({
  event_id: randomUUID(), type: 'page_view', name: 'page_view', anonymous_id: anon, session_id: session, url, timestamp: ts,
});
let db: DB;

beforeAll(() => {
  db = createTestDb();
  ingestEvents(db, {
    projectId: 'demo', source: 'browser', now: NOW,
    events: [
      pv('anon_a', 's1', '/', '2026-10-14T09:00:00.000Z'),
      pv('anon_a', 's1', '/menu', '2026-10-14T09:01:00.000Z'),
      { event_id: randomUUID(), type: 'track', name: 'add_to_cart', anonymous_id: 'anon_a', session_id: 's1', timestamp: '2026-10-14T09:02:00.000Z' },
      pv('anon_a', 's2', '/menu', '2026-10-15T10:00:00.000Z'),
      pv('anon_b', 's3', '/', '2026-10-15T11:00:00.000Z'),
      pv('anon_c', 's4', '/menu', '2026-10-16T23:59:59.999Z'), // last ms of the 16th: included
      pv('anon_d', 's5', '/', '2026-10-17T00:00:00.000Z'), // first ms of the 17th: excluded
    ],
  });
  ingestEvents(db, {
    projectId: 'demo', source: 'server', now: NOW,
    events: [{ event_id: randomUUID(), type: 'track', name: 'order_created', anonymous_id: 'anon_b', timestamp: '2026-10-15T11:05:00.000Z', properties: { total: 25.5 } }],
  });
});

const range = (from: string, to: string) => ({ from, to });

describe('getOverview', () => {
  it('counts page views, visitors, sessions, events, orders and revenue', () => {
    expect(getOverview(db, 'demo', range('2026-10-14', '2026-10-16'))).toEqual({
      pageViews: 5, uniqueVisitors: 3, sessions: 4, events: 2, orders: 1, revenue: 25.5,
    });
  });
  it('respects the date range', () => {
    expect(getOverview(db, 'demo', range('2026-10-15', '2026-10-15'))).toMatchObject({ pageViews: 2, uniqueVisitors: 2, sessions: 2, orders: 1 });
  });
  it('isolates projects', () => {
    expect(getOverview(db, 'other', range('2026-10-14', '2026-10-16')).pageViews).toBe(0);
  });
});

describe('getTimeseries', () => {
  it('returns one zero-filled row per day', () => {
    expect(getTimeseries(db, 'demo', range('2026-10-13', '2026-10-16'))).toEqual([
      { date: '2026-10-13', pageViews: 0, uniqueVisitors: 0 },
      { date: '2026-10-14', pageViews: 2, uniqueVisitors: 1 },
      { date: '2026-10-15', pageViews: 2, uniqueVisitors: 2 },
      { date: '2026-10-16', pageViews: 1, uniqueVisitors: 1 },
    ]);
  });
});

describe('getTopPages', () => {
  it('ranks pages by views', () => {
    expect(getTopPages(db, 'demo', range('2026-10-14', '2026-10-16'), 10)).toEqual([
      { url: '/menu', views: 3, uniqueVisitors: 2 },
      { url: '/', views: 2, uniqueVisitors: 2 },
    ]);
  });
});

describe('getEventTrends', () => {
  it('returns custom event counts per day', () => {
    expect(getEventTrends(db, 'demo', range('2026-10-14', '2026-10-16'))).toEqual({
      names: ['add_to_cart', 'order_created'],
      series: [
        { date: '2026-10-14', add_to_cart: 1, order_created: 0 },
        { date: '2026-10-15', add_to_cart: 0, order_created: 1 },
        { date: '2026-10-16', add_to_cart: 0, order_created: 0 },
      ],
    });
  });
});

describe('parseRange', () => {
  const today = new Date('2026-10-16T08:00:00Z');
  const p = (q: string) => parseRange(new URLSearchParams(q), today);
  it('defaults to the last 7 days', () => {
    expect(p('')).toEqual({ from: '2026-10-10', to: '2026-10-16' });
  });
  it('accepts explicit dates', () => {
    expect(p('from=2026-10-01&to=2026-10-05')).toEqual({ from: '2026-10-01', to: '2026-10-05' });
  });
  it('rejects bad input', () => {
    expect(() => p('from=2026-02-31&to=2026-03-01')).toThrow(InvalidRangeError);
    expect(() => p('from=yesterday')).toThrow(InvalidRangeError);
    expect(() => p('from=2026-10-05&to=2026-10-01')).toThrow(InvalidRangeError);
    expect(() => p('from=2024-01-01&to=2026-10-01')).toThrow(InvalidRangeError);
  });
});
