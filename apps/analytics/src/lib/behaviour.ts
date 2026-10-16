import type { DB } from './db';
import { dayRangeBounds, type DateRange, type RecentEvent } from './stats';

/** Visitor behaviour: who is on the site now, what each visitor did, and which dishes they like. */

type EventRow = Omit<RecentEvent, 'properties'> & { properties: string };

const EVENT_COLUMNS = `id, type, name, source, url, anonymous_id AS anonymousId, user_id AS userId,
  properties, occurred_at AS occurredAt`;

const toEvent = (r: EventRow): RecentEvent => ({ ...r, properties: JSON.parse(r.properties) as Record<string, unknown> });

export interface LiveVisitor {
  anonymousId: string;
  userId: string | null;
  currentPage: string | null;
  lastSeen: string;
  events: number;
  lastEvent: RecentEvent;
}

/** Visitors with any event in the last `windowMinutes`, most recently active first. */
export function getLiveVisitors(db: DB, projectId: string, now: Date = new Date(), windowMinutes = 5, limit = 20): LiveVisitor[] {
  const since = new Date(now.getTime() - windowMinutes * 60_000).toISOString();
  const until = new Date(now.getTime() + 60_000).toISOString(); // small allowance for client clock skew
  const visitors = db
    .prepare(
      `SELECT anonymous_id AS anonymousId, MAX(occurred_at) AS lastSeen, COUNT(*) AS events
       FROM events
       WHERE project_id = ? AND anonymous_id IS NOT NULL AND occurred_at >= ? AND occurred_at <= ?
       GROUP BY anonymous_id
       ORDER BY lastSeen DESC
       LIMIT ?`,
    )
    .all(projectId, since, until, limit) as { anonymousId: string; lastSeen: string; events: number }[];

  const lastEvent = db.prepare(
    `SELECT ${EVENT_COLUMNS} FROM events WHERE project_id = ? AND anonymous_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 1`,
  );
  const lastPage = db.prepare(
    `SELECT url FROM events WHERE project_id = ? AND anonymous_id = ? AND type = 'page_view' ORDER BY occurred_at DESC, id DESC LIMIT 1`,
  );
  const lastUser = db.prepare(
    `SELECT user_id AS userId FROM events WHERE project_id = ? AND anonymous_id = ? AND user_id IS NOT NULL ORDER BY occurred_at DESC, id DESC LIMIT 1`,
  );

  return visitors.map((v) => ({
    ...v,
    userId: (lastUser.get(projectId, v.anonymousId) as { userId: string } | undefined)?.userId ?? null,
    currentPage: (lastPage.get(projectId, v.anonymousId) as { url: string | null } | undefined)?.url ?? null,
    lastEvent: toEvent(lastEvent.get(projectId, v.anonymousId) as EventRow),
  }));
}

/** One visitor's events in time order (the most recent `limit`). */
export function getVisitorJourney(db: DB, projectId: string, anonymousId: string, limit = 40): RecentEvent[] {
  const rows = db
    .prepare(
      `SELECT ${EVENT_COLUMNS} FROM events WHERE project_id = ? AND anonymous_id = ?
       ORDER BY occurred_at DESC, id DESC LIMIT ?`,
    )
    .all(projectId, anonymousId, limit) as EventRow[];
  return rows.reverse().map(toEvent);
}

export interface DishStats {
  itemId: string;
  name: string;
  addedToCart: number;
  visitors: number;
  ordered: number;
}

/** Per-dish counts from `add_to_cart` (browser) and `order_created` (server) events matching `where`. */
function dishCounts(db: DB, where: string, params: Record<string, unknown>): DishStats[] {
  const adds = db
    .prepare(
      `SELECT json_extract(properties, '$.itemId') AS itemId,
              MAX(json_extract(properties, '$.name')) AS name,
              COUNT(*) AS addedToCart,
              COUNT(DISTINCT anonymous_id) AS visitors
       FROM events
       WHERE ${where} AND name = 'add_to_cart' AND json_extract(properties, '$.itemId') IS NOT NULL
       GROUP BY itemId`,
    )
    .all(params) as Omit<DishStats, 'ordered'>[];
  const orders = db
    .prepare(
      `SELECT item.value AS itemId, COUNT(*) AS ordered
       FROM events, json_each(events.properties, '$.items') AS item
       WHERE ${where} AND events.name = 'order_created' AND events.source = 'server'
       GROUP BY item.value`,
    )
    .all(params) as { itemId: string; ordered: number }[];

  const byId = new Map<string, DishStats>();
  for (const a of adds) byId.set(a.itemId, { ...a, name: a.name ?? a.itemId, ordered: 0 });
  for (const o of orders) {
    const dish = byId.get(o.itemId) ?? { itemId: o.itemId, name: o.itemId, addedToCart: 0, visitors: 0, ordered: 0 };
    dish.ordered = o.ordered;
    byId.set(o.itemId, dish);
  }
  return [...byId.values()];
}

/** Dishes ranked by orders, then by how often they were added to the cart. */
export function getPopularDishes(db: DB, projectId: string, range: DateRange, limit = 10): DishStats[] {
  const where = 'events.project_id = @projectId AND events.occurred_at >= @start AND events.occurred_at < @end';
  return dishCounts(db, where, { projectId, ...dayRangeBounds(range) })
    .sort((a, b) => b.ordered - a.ordered || b.addedToCart - a.addedToCart || a.itemId.localeCompare(b.itemId))
    .slice(0, limit);
}

export interface VisitorProfile {
  visits: number;
  lastSeen: string | null;
  favourites: { itemId: string; name: string; score: number }[];
}

/**
 * What we know about a returning visitor: matched by this device's anonymous id, or by the
 * logged-in user id across devices. Favourites weigh an order twice as much as an add to cart.
 */
export function getVisitorProfile(db: DB, projectId: string, ids: { anonymousId?: string | null; userId?: string | null }): VisitorProfile {
  const params = { projectId, anon: ids.anonymousId ?? null, user: ids.userId ?? null };
  const where = `events.project_id = @projectId AND (
    (@anon IS NOT NULL AND events.anonymous_id = @anon) OR (@user IS NOT NULL AND events.user_id = @user))`;
  const summary = db
    .prepare(`SELECT COUNT(DISTINCT session_id) AS visits, MAX(occurred_at) AS lastSeen FROM events WHERE ${where}`)
    .get(params) as { visits: number; lastSeen: string | null };
  const favourites = dishCounts(db, where, params)
    .map((d) => ({ itemId: d.itemId, name: d.name, score: d.ordered * 2 + d.addedToCart }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId))
    .slice(0, 3);
  return { visits: summary.visits, lastSeen: summary.lastSeen, favourites };
}
