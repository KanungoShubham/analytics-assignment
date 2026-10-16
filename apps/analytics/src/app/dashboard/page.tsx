import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '../../lib/auth';
import { config } from '../../lib/config';
import { getDb } from '../../lib/db';
import {
  getEventTrends, getFunnel, getOverview, getRecentEvents, getTimeseries, getTopPages,
  parseRange, presetRanges, previousRange, type DateRange,
} from '../../lib/stats';
import { getLiveVisitors, getPopularDishes, getVisitorJourney } from '../../lib/behaviour';
import { ActivityFeed } from '../../components/ActivityFeed';
import { LiveVisitors } from '../../components/LiveVisitors';
import { PopularDishes } from '../../components/PopularDishes';
import { EventsChart } from '../../components/EventsChart';
import { Funnel } from '../../components/Funnel';
import { KpiStrip, type Kpi } from '../../components/KpiStrip';
import { LiveToggle } from '../../components/LiveToggle';
import { TopPages } from '../../components/TopPages';
import { TrafficChart } from '../../components/TrafficChart';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const icon = (d: string, color: string) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  views: icon('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', '#0f766e'),
  visitors: icon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', '#1d4ed8'),
  sessions: icon('M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', '#6d28d9'),
  orders: icon('M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0', '#b45309'),
  revenue: icon('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', '#b45309'),
};

const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

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
  const before = getOverview(db, projectId, previousRange(range));
  const timeseries = getTimeseries(db, projectId, range);
  const funnel = getFunnel(db, projectId, range);
  const recent = getRecentEvents(db, projectId, range, 25);
  const topPages = getTopPages(db, projectId, range, 8);
  const trends = getEventTrends(db, projectId, range);
  const dishes = getPopularDishes(db, projectId, range, 7);
  const now = Date.now();
  const live = getLiveVisitors(db, projectId, new Date(now), 5).map((v) => ({ ...v, journey: getVisitorJourney(db, projectId, v.anonymousId, 30) }));

  const kpis: Kpi[] = [
    { label: 'Page views', value: overview.pageViews, previous: before.pageViews, icon: ICONS.views, tint: '#e3f2f0' },
    { label: 'Unique visitors', value: overview.uniqueVisitors, previous: before.uniqueVisitors, icon: ICONS.visitors, tint: '#e6edfc' },
    { label: 'Sessions', value: overview.sessions, previous: before.sessions, icon: ICONS.sessions, tint: '#efe8fc' },
    { label: 'Orders', value: overview.orders, previous: before.orders, icon: ICONS.orders, tint: '#fdf1e3' },
    { label: 'Revenue', value: overview.revenue, previous: before.revenue, format: 'money', icon: ICONS.revenue, tint: '#fdf1e3' },
  ];

  const presets = presetRanges();
  const restaurant = 'http://localhost:3001';

  return (
    <>
      <header className="topbar">
        <div className="inner">
          <a className="logo" href="/dashboard">
            <span className="logo-mark" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
            </span>
            Analytics
          </a>
          <span className="project">{config.demoProject.name}</span>
          <span className="spacer" />
          <a className="site-link" href={restaurant} target="_blank" rel="noreferrer">Open restaurant demo</a>
          <form method="post" action="/api/logout">
            <button className="signout" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <main className="container">
        <div className="toolbar">
          <div>
            <h1>Overview</h1>
            <div className="range-text">
              {range.from === range.to ? fmtDay(range.from) : `${fmtDay(range.from)} – ${fmtDay(range.to)}`} · UTC
            </div>
          </div>
          <div className="filters">
            <nav className="segmented" aria-label="Date range">
              {presets.map((p) => (
                <a key={p.label} className={p.from === range.from && p.to === range.to ? 'active' : ''} href={`?from=${p.from}&to=${p.to}`}>
                  {p.label}
                </a>
              ))}
            </nav>
            <form className="custom-range" method="get" aria-label="Custom date range">
              <input type="date" name="from" defaultValue={range.from} aria-label="From" />
              <span>to</span>
              <input type="date" name="to" defaultValue={range.to} aria-label="To" />
              <button className="btn" type="submit">Apply</button>
            </form>
            <LiveToggle />
          </div>
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        <KpiStrip kpis={kpis} />

        <div className="grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2><span className="live-badge" aria-hidden />Live now · {live.length} on the site</h2>
                <p>Visitors active in the last 5 minutes. Click one to see every step they took.</p>
              </div>
            </div>
            <LiveVisitors visitors={live} now={now} />
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Popular dishes</h2>
                <p>Added to cart and ordered, in this range</p>
              </div>
            </div>
            <PopularDishes dishes={dishes} />
          </section>
        </div>

        <div className="grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Traffic</h2>
                <p>Page views and unique visitors per day</p>
              </div>
            </div>
            <TrafficChart data={timeseries} />
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Ordering funnel</h2>
                <p>Visitors reaching each step</p>
              </div>
            </div>
            <Funnel steps={funnel} />
          </section>
        </div>

        <div className="grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Event trends</h2>
                <p>Custom and server events per day</p>
              </div>
            </div>
            {trends.names.length ? (
              <EventsChart names={trends.names} series={trends.series} />
            ) : (
              <div className="empty">No custom events in this range.</div>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Recent activity</h2>
                <p>Latest events, newest first</p>
              </div>
            </div>
            <ActivityFeed events={recent} now={now} />
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Popular pages</h2>
              <p>Most viewed pages in this range</p>
            </div>
          </div>
          <TopPages pages={topPages} />
        </section>
      </main>
    </>
  );
}
