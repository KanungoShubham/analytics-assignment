import type { RecentEvent } from '../lib/stats';
import { ago, dotClass, what, who } from '../lib/describe';

export function ActivityFeed({ events, now }: { events: RecentEvent[]; now: number }) {
  if (events.length === 0) {
    return <div className="empty">No activity in this range. Open the restaurant demo and browse the menu.</div>;
  }
  return (
    <ul className="feed">
      {events.map((e) => (
        <li key={e.id}>
          <span className={`feed-dot ${dotClass(e)}`} aria-hidden />
          <div>
            <div className="feed-what">
              <strong>{who(e)}</strong> {what(e)}
              {e.source === 'server' && <span className="source-tag">server</span>}
            </div>
            {e.type !== 'page_view' && e.url && <div className="feed-meta">on {e.url}</div>}
          </div>
          <time className="feed-time" dateTime={e.occurredAt}>{ago(e.occurredAt, now)}</time>
        </li>
      ))}
    </ul>
  );
}
