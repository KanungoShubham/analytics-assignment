import type { RecentEvent } from '../lib/stats';

function who(e: RecentEvent): string {
  if (e.userId) return e.userId.replace(/^user_/, '').replace(/_/g, ' ');
  return e.anonymousId ? `Visitor ${e.anonymousId.slice(-4)}` : 'Unknown visitor';
}

function what(e: RecentEvent): string {
  const p = e.properties;
  switch (e.name) {
    case 'page_view':
      return `viewed ${e.url ?? 'a page'}`;
    case 'identify':
      return 'logged in';
    case 'add_to_cart':
      return `added ${String(p.name ?? p.itemId ?? 'a dish')} to the cart`;
    case 'remove_from_cart':
      return `removed ${String(p.itemId ?? 'a dish')} from the cart`;
    case 'checkout_started':
      return 'started checkout';
    case 'order_created':
      return `placed an order${typeof p.total === 'number' ? ` for $${p.total.toFixed(2)}` : ''}`;
    default:
      return e.name.replace(/_/g, ' ');
  }
}

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const dotClass = (e: RecentEvent) => (e.name === 'order_created' ? 'order' : e.type);

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
