import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '../../lib/auth';
import { config } from '../../lib/config';
import { getDb } from '../../lib/db';
import {
  getEventTrends, getOverview, getTimeseries, getTopPages, parseRange, presetRanges, type DateRange,
} from '../../lib/stats';
import { TrafficChart } from '../../components/TrafficChart';
import { EventsChart } from '../../components/EventsChart';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token, config.sessionSecret)) redirect('/login');

  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const key of ['from', 'to']) {
    const v = sp[key];
    if (typeof v === 'string' && v) params.set(key, v);
  }

  let range: DateRange;
  let error: string | null = null;
  try {
    range = parseRange(params);
  } catch (e) {
    error = `${(e as Error).message}. Showing the last 7 days instead.`;
    range = parseRange(new URLSearchParams());
  }

  const db = getDb();
  const projectId = config.demoProject.id;
  const overview = getOverview(db, projectId, range);
  const timeseries = getTimeseries(db, projectId, range);
  const topPages = getTopPages(db, projectId, range, 10);
  const trends = getEventTrends(db, projectId, range);

  const kpis = [
    { label: 'Page views', value: overview.pageViews },
    { label: 'Unique visitors', value: overview.uniqueVisitors },
    { label: 'Sessions', value: overview.sessions },
    { label: 'Orders', value: overview.orders },
    { label: 'Revenue', value: `$${overview.revenue.toFixed(2)}` },
  ];

  return (
    <main className="container">
      <div className="header">
        <h1>{config.demoProject.name} · Analytics</h1>
        <form method="post" action="/api/logout">
          <button className="secondary" type="submit">Sign out</button>
        </form>
      </div>

      <form className="filters" method="get">
        {presetRanges().map((p) => (
          <a key={p.label} className={`preset ${p.from === range.from && p.to === range.to ? 'active' : ''}`} href={`?from=${p.from}&to=${p.to}`}>
            {p.label}
          </a>
        ))}
        <label>From<input type="date" name="from" defaultValue={range.from} /></label>
        <label>To<input type="date" name="to" defaultValue={range.to} /></label>
        <button type="submit">Apply</button>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="grid-kpi">
        {kpis.map((k) => (
          <div className="card" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card section">
        <h2>Traffic (UTC days)</h2>
        <TrafficChart data={timeseries} />
      </div>

      <div className="card section">
        <h2>Event trends</h2>
        {trends.names.length ? <EventsChart names={trends.names} series={trends.series} /> : <div className="empty">No custom events in this range.</div>}
      </div>

      <div className="card section">
        <h2>Popular pages</h2>
        {topPages.length ? (
          <table>
            <thead>
              <tr><th>Page</th><th className="num">Views</th><th className="num">Unique visitors</th></tr>
            </thead>
            <tbody>
              {topPages.map((p) => (
                <tr key={p.url}><td>{p.url}</td><td className="num">{p.views}</td><td className="num">{p.uniqueVisitors}</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No page views in this range.</div>
        )}
      </div>
    </main>
  );
}
