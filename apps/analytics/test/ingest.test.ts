import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestDb } from './helpers';
import { ingestEvents, normaliseOccurredAt } from '../src/lib/ingest';

const NOW = new Date('2026-10-16T12:00:00.000Z');
const ev = (over: Record<string, unknown> = {}) => ({
  event_id: randomUUID(),
  type: 'track',
  name: 'add_to_cart',
  anonymous_id: 'anon_1',
  session_id: 'sess_1',
  timestamp: '2026-10-16T11:59:00.000Z',
  url: '/menu',
  properties: { item: 'Pizza' },
  ...over,
});
const count = (db: ReturnType<typeof createTestDb>) =>
  (db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n;

describe('ingestEvents', () => {
  it('stores valid events with properties as JSON', () => {
    const db = createTestDb();
    const res = ingestEvents(db, { projectId: 'demo', source: 'browser', events: [ev()], userAgent: 'UA', now: NOW });
    expect(res).toEqual({ accepted: 1, duplicates: 0, rejected: [] });
    const row = db.prepare('SELECT * FROM events').get() as Record<string, string>;
    expect(row.source).toBe('browser');
    expect(JSON.parse(row.properties)).toEqual({ item: 'Pizza' });
    expect(row.received_at).toBe(NOW.toISOString());
    expect(row.user_agent).toBe('UA');
  });

  it('rejects invalid events individually and keeps the valid ones', () => {
    const db = createTestDb();
    const res = ingestEvents(db, {
      projectId: 'demo', source: 'browser', now: NOW,
      events: [ev(), ev({ name: 'bad name' }), 'not-an-object', ev()],
    });
    expect(res.accepted).toBe(2);
    expect(res.rejected.map((r) => r.index)).toEqual([1, 2]);
    expect(res.rejected[0].error).toContain('name');
    expect(count(db)).toBe(2);
  });

  it('duplicate event_id is stored once', () => {
    const db = createTestDb();
    const e = ev();
    ingestEvents(db, { projectId: 'demo', source: 'browser', events: [e], now: NOW });
    const res = ingestEvents(db, { projectId: 'demo', source: 'browser', events: [e, e], now: NOW });
    expect(res).toEqual({ accepted: 0, duplicates: 2, rejected: [] });
    expect(count(db)).toBe(1);
  });

  it('browser events require anonymous_id, server events accept user_id only', () => {
    const db = createTestDb();
    const noAnon = ev({ anonymous_id: null, user_id: 'user_1' });
    expect(ingestEvents(db, { projectId: 'demo', source: 'browser', events: [noAnon], now: NOW }).rejected).toHaveLength(1);
    expect(ingestEvents(db, { projectId: 'demo', source: 'server', events: [noAnon], now: NOW }).accepted).toBe(1);
  });
});

describe('normaliseOccurredAt', () => {
  it('keeps plausible client times, converted to UTC ISO', () => {
    expect(normaliseOccurredAt('2026-10-14T12:00:00+02:00', NOW)).toBe('2026-10-14T10:00:00.000Z');
  });
  it('uses server time when the client clock is far off', () => {
    expect(normaliseOccurredAt('2026-10-18T12:00:00.000Z', NOW)).toBe(NOW.toISOString()); // +2 days
    expect(normaliseOccurredAt('2026-10-01T12:00:00.000Z', NOW)).toBe(NOW.toISOString()); // -15 days
  });
});
