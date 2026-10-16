import type { DB } from './db';

export interface DateRange {
  from: string; // YYYY-MM-DD, inclusive (UTC)
  to: string; // YYYY-MM-DD, inclusive (UTC)
}

export class InvalidRangeError extends Error {}

const DAY_MS = 86_400_000;
const MAX_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const dayStart = (date: string) => Date.parse(`${date}T00:00:00.000Z`);

function validDate(value: string): boolean {
  // Round-trip check rejects impossible dates such as 2026-02-31.
  return DATE_RE.test(value) && !Number.isNaN(dayStart(value)) && toDateStr(new Date(dayStart(value))) === value;
}

export function parseRange(params: URLSearchParams, today: Date = new Date()): DateRange {
  const to = params.get('to') || toDateStr(today);
  if (!validDate(to)) throw new InvalidRangeError(`Invalid "to" date: ${to}`);
  const from = params.get('from') || toDateStr(new Date(dayStart(to) - 6 * DAY_MS));
  if (!validDate(from)) throw new InvalidRangeError(`Invalid "from" date: ${from}`);
  if (from > to) throw new InvalidRangeError('"from" must be on or before "to"');
  if ((dayStart(to) - dayStart(from)) / DAY_MS + 1 > MAX_DAYS) throw new InvalidRangeError(`Range cannot exceed ${MAX_DAYS} days`);
  return { from, to };
}

export function presetRanges(today: Date = new Date()) {
  const to = toDateStr(today);
  const back = (days: number) => toDateStr(new Date(dayStart(to) - days * DAY_MS));
  return [
    { label: 'Today', from: to, to },
    { label: 'Last 7 days', from: back(6), to },
    { label: 'Last 30 days', from: back(29), to },
    { label: 'Last 90 days', from: back(89), to },
  ];
}

export function listDays(range: DateRange): string[] {
  const days: string[] = [];
  for (let t = dayStart(range.from); t <= dayStart(range.to); t += DAY_MS) days.push(toDateStr(new Date(t)));
  return days;
}

/** Half-open interval [start, end) on occurred_at; ISO strings compare correctly as text. */
function bounds(projectId: string, range: DateRange) {
  return {
    projectId,
    start: new Date(dayStart(range.from)).toISOString(),
    end: new Date(dayStart(range.to) + DAY_MS).toISOString(),
  };
}

const WHERE = 'project_id = @projectId AND occurred_at >= @start AND occurred_at < @end';

export interface Overview {
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  events: number;
  orders: number;
  revenue: number;
}

export function getOverview(db: DB, projectId: string, range: DateRange): Overview {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(type = 'page_view'), 0) AS pageViews,
         COUNT(DISTINCT CASE WHEN source = 'browser' THEN anonymous_id END) AS uniqueVisitors,
         COUNT(DISTINCT session_id) AS sessions,
         COALESCE(SUM(type = 'track'), 0) AS events,
         -- Business KPIs only count trusted server events (secret key), never browser events.
         COALESCE(SUM(name = 'order_created' AND source = 'server'), 0) AS orders,
         COALESCE(SUM(CASE WHEN name = 'order_created' AND source = 'server' THEN json_extract(properties, '$.total') END), 0) AS revenue
       FROM events WHERE ${WHERE}`,
    )
    .get(bounds(projectId, range)) as Overview;
  return { ...row, revenue: Math.round(row.revenue * 100) / 100 };
}

export interface TimeseriesPoint {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
}

export function getTimeseries(db: DB, projectId: string, range: DateRange): TimeseriesPoint[] {
  const rows = db
    .prepare(
      `SELECT substr(occurred_at, 1, 10) AS date,
              SUM(type = 'page_view') AS pageViews,
              COUNT(DISTINCT CASE WHEN source = 'browser' THEN anonymous_id END) AS uniqueVisitors
       FROM events WHERE ${WHERE}
       GROUP BY date`,
    )
    .all(bounds(projectId, range)) as TimeseriesPoint[];
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return listDays(range).map((date) => byDate.get(date) ?? { date, pageViews: 0, uniqueVisitors: 0 });
}

export interface TopPage {
  url: string;
  views: number;
  uniqueVisitors: number;
}

export function getTopPages(db: DB, projectId: string, range: DateRange, limit = 10): TopPage[] {
  return db
    .prepare(
      `SELECT url, COUNT(*) AS views, COUNT(DISTINCT anonymous_id) AS uniqueVisitors
       FROM events
       WHERE ${WHERE} AND type = 'page_view' AND url IS NOT NULL
       GROUP BY url
       ORDER BY views DESC, url ASC
       LIMIT @limit`,
    )
    .all({ ...bounds(projectId, range), limit }) as TopPage[];
}

export interface EventTrends {
  names: string[];
  series: Record<string, string | number>[];
}

export function getEventTrends(db: DB, projectId: string, range: DateRange): EventTrends {
  const rows = db
    .prepare(
      `SELECT substr(occurred_at, 1, 10) AS date, name, COUNT(*) AS count
       FROM events WHERE ${WHERE} AND type = 'track'
       GROUP BY date, name`,
    )
    .all(bounds(projectId, range)) as { date: string; name: string; count: number }[];

  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.name, (totals.get(r.name) ?? 0) + r.count);
  const names = [...totals.keys()].sort((a, b) => totals.get(b)! - totals.get(a)! || a.localeCompare(b));

  const series = listDays(range).map((date) => {
    const point: Record<string, string | number> = { date };
    for (const n of names) point[n] = 0;
    return point;
  });
  const byDate = new Map(series.map((p) => [p.date as string, p]));
  for (const r of rows) byDate.get(r.date)![r.name] = r.count;
  return { names, series };
}

/** The same number of days immediately before `range`, for "vs previous period" deltas. */
export function previousRange(range: DateRange): DateRange {
  const days = listDays(range).length;
  const to = new Date(dayStart(range.from) - DAY_MS);
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  return { from: toDateStr(from), to: toDateStr(to) };
}

export interface FunnelStep {
  key: 'visited' | 'add_to_cart' | 'checkout_started' | 'order_created';
  label: string;
  visitors: number;
}

/** Distinct visitors (anonymous_id) reaching each step of the ordering journey in the range. */
export function getFunnel(db: DB, projectId: string, range: DateRange): FunnelStep[] {
  const row = db
    .prepare(
      `SELECT
         COUNT(DISTINCT CASE WHEN type = 'page_view' THEN anonymous_id END) AS visited,
         COUNT(DISTINCT CASE WHEN name = 'add_to_cart' THEN anonymous_id END) AS add_to_cart,
         COUNT(DISTINCT CASE WHEN name = 'checkout_started' THEN anonymous_id END) AS checkout_started,
         COUNT(DISTINCT CASE WHEN name = 'order_created' AND source = 'server' THEN anonymous_id END) AS order_created
       FROM events WHERE ${WHERE}`,
    )
    .get(bounds(projectId, range)) as Record<FunnelStep['key'], number>;
  return [
    { key: 'visited', label: 'Visited', visitors: row.visited },
    { key: 'add_to_cart', label: 'Added to cart', visitors: row.add_to_cart },
    { key: 'checkout_started', label: 'Started checkout', visitors: row.checkout_started },
    { key: 'order_created', label: 'Ordered', visitors: row.order_created },
  ];
}

export interface RecentEvent {
  id: number;
  type: string;
  name: string;
  source: string;
  url: string | null;
  anonymousId: string | null;
  userId: string | null;
  properties: Record<string, unknown>;
  occurredAt: string;
}

/** Newest events first: the "who did what" activity feed. */
export function getRecentEvents(db: DB, projectId: string, range: DateRange, limit = 20): RecentEvent[] {
  const rows = db
    .prepare(
      `SELECT id, type, name, source, url, anonymous_id AS anonymousId, user_id AS userId, properties, occurred_at AS occurredAt
       FROM events WHERE ${WHERE}
       ORDER BY occurred_at DESC, id DESC
       LIMIT @limit`,
    )
    .all({ ...bounds(projectId, range), limit }) as (Omit<RecentEvent, 'properties'> & { properties: string })[];
  return rows.map((r) => ({ ...r, properties: JSON.parse(r.properties) as Record<string, unknown> }));
}
