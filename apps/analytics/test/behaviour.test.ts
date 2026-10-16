import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestDb } from './helpers';
import { ingestEvents } from '../src/lib/ingest';
import { getLiveVisitors, getPopularDishes, getVisitorJourney, getVisitorProfile } from '../src/lib/behaviour';
import { handleProfile } from '../src/lib/profile-handler';
import type { DB } from '../src/lib/db';

const NOW = new Date('2026-10-16T12:00:00.000Z');
const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
let db: DB;

const browser = (anon: string, minutesAgo: number, type: string, name: string, extra: Record<string, unknown> = {}) => ({
  event_id: randomUUID(), type, name, anonymous_id: anon, session_id: `s_${anon}`, timestamp: at(minutesAgo), url: '/menu', ...extra,
});
const add = (anon: string, minutesAgo: number, itemId: string, itemName: string, user?: string) =>
  browser(anon, minutesAgo, 'track', 'add_to_cart', { properties: { itemId, name: itemName }, user_id: user ?? null });

beforeAll(() => {
  db = createTestDb();
  ingestEvents(db, {
    projectId: 'demo', source: 'browser', now: NOW,
    events: [
      // Asha: browses, logs in, adds pizza twice and tiramisu once, is on /checkout now.
      browser('anon_asha', 30, 'page_view', 'page_view', { url: '/' }),
      browser('anon_asha', 3, 'page_view', 'page_view', { url: '/menu' }),
      browser('anon_asha', 2.5, 'identify', 'identify', { user_id: 'user_asha' }),
      add('anon_asha', 2, 'margherita', 'Margherita Pizza', 'user_asha'),
      add('anon_asha', 1.8, 'margherita', 'Margherita Pizza', 'user_asha'),
      add('anon_asha', 1.5, 'tiramisu', 'Tiramisu', 'user_asha'),
      browser('anon_asha', 1, 'page_view', 'page_view', { url: '/checkout', user_id: 'user_asha' }),
      // Ben: active 4 minutes ago, adds carbonara.
      browser('anon_ben', 4.5, 'page_view', 'page_view', { url: '/menu' }),
      add('anon_ben', 4, 'carbonara', 'Spaghetti Carbonara'),
      // Old visitor: 2 hours ago, adds pizza. Not live.
      browser('anon_old', 120, 'page_view', 'page_view', { url: '/' }),
      add('anon_old', 119, 'margherita', 'Margherita Pizza'),
    ],
  });
  ingestEvents(db, {
    projectId: 'demo', source: 'server', now: NOW,
    events: [{ event_id: randomUUID(), type: 'track', name: 'order_created', anonymous_id: 'anon_old', timestamp: at(118), properties: { orderId: 'o1', total: 12.5, items: ['margherita'] } }],
  });
});

describe('getLiveVisitors', () => {
  it('lists visitors active in the last 5 minutes, newest first, with page and last action', () => {
    const live = getLiveVisitors(db, 'demo', NOW, 5);
    expect(live.map((v) => v.anonymousId)).toEqual(['anon_asha', 'anon_ben']);
    expect(live[0]).toMatchObject({ userId: 'user_asha', currentPage: '/checkout', lastEvent: { name: 'page_view' } });
    expect(live[1]).toMatchObject({ userId: null, currentPage: '/menu', lastEvent: { name: 'add_to_cart' } });
  });
});

describe('getVisitorJourney', () => {
  it('returns the visitor events in time order', () => {
    const journey = getVisitorJourney(db, 'demo', 'anon_asha');
    expect(journey.map((e) => e.name)).toEqual(['page_view', 'page_view', 'identify', 'add_to_cart', 'add_to_cart', 'add_to_cart', 'page_view']);
  });
});

describe('getPopularDishes', () => {
  it('counts adds, distinct visitors and orders per dish', () => {
    const dishes = getPopularDishes(db, 'demo', { from: '2026-10-16', to: '2026-10-16' });
    expect(dishes).toEqual([
      { itemId: 'margherita', name: 'Margherita Pizza', addedToCart: 3, visitors: 2, ordered: 1 },
      { itemId: 'carbonara', name: 'Spaghetti Carbonara', addedToCart: 1, visitors: 1, ordered: 0 },
      { itemId: 'tiramisu', name: 'Tiramisu', addedToCart: 1, visitors: 1, ordered: 0 },
    ]);
  });
});

describe('getVisitorProfile', () => {
  it('returns favourites for a returning visitor, most added first', () => {
    const profile = getVisitorProfile(db, 'demo', { anonymousId: 'anon_asha' });
    expect(profile.favourites.map((f) => f.itemId)).toEqual(['margherita', 'tiramisu']);
    expect(profile.lastSeen).toBe(at(1));
  });
  it('matches by user id across devices', () => {
    const profile = getVisitorProfile(db, 'demo', { anonymousId: 'anon_new_device', userId: 'user_asha' });
    expect(profile.favourites[0].itemId).toBe('margherita');
  });
  it('is empty for an unknown visitor', () => {
    expect(getVisitorProfile(db, 'demo', { anonymousId: 'nobody' })).toEqual({ visits: 0, lastSeen: null, favourites: [] });
  });
});

describe('GET /api/profile', () => {
  const req = (q: string, auth?: string) =>
    new Request(`http://localhost:3000/api/profile?${q}`, { headers: auth ? { authorization: auth } : {} });
  it('requires the secret key', () => {
    expect(handleProfile(req('anonymousId=anon_asha'), db).status).toBe(401);
    expect(handleProfile(req('anonymousId=anon_asha', 'Bearer pk_test'), db).status).toBe(401);
  });
  it('requires an id', () => {
    expect(handleProfile(req('', 'Bearer sk_test'), db).status).toBe(400);
  });
  it('returns the profile', async () => {
    const res = handleProfile(req('anonymousId=anon_asha', 'Bearer sk_test'), db);
    expect(res.status).toBe(200);
    expect((await res.json()).favourites[0]).toMatchObject({ itemId: 'margherita', name: 'Margherita Pizza' });
  });
});
