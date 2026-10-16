import type { LiveVisitor } from '../lib/behaviour';
import type { RecentEvent } from '../lib/stats';
import { ago, clock, dotClass, what, who } from '../lib/describe';

export interface LiveVisitorWithJourney extends LiveVisitor {
  journey: RecentEvent[];
}

/** Who is on the restaurant site right now, where they are, and every step they took. */
export function LiveVisitors({ visitors, now }: { visitors: LiveVisitorWithJourney[]; now: number }) {
  if (visitors.length === 0) {
    return (
      <div className="empty">
        Nobody is on the restaurant site right now. Open <a href="http://localhost:3001" target="_blank" rel="noreferrer">the demo</a> and this
        list updates within 10 seconds.
      </div>
    );
  }
  return (
    <ul className="live-list">
      {visitors.map((v) => {
        const name = who(v);
        return (
          <li key={v.anonymousId}>
            {/* Users may open a row before hydration finishes; the open state is theirs to keep. */}
            <details suppressHydrationWarning>
              <summary>
                <span className={`avatar ${v.userId ? 'known' : ''}`} aria-hidden>{name.replace('Visitor ', '').slice(0, 2).toUpperCase()}</span>
                <span className="live-who">
                  <strong>{name}</strong>
                  {v.userId ? <span className="pill known">logged in</span> : <span className="pill">guest</span>}
                  <span className="live-action">{what(v.lastEvent)}</span>
                </span>
                <span className="live-page">{v.currentPage ?? '—'}</span>
                <span className="live-seen">{ago(v.lastSeen, now)}</span>
              </summary>
              <ol className="journey" aria-label={`Journey of ${name}`}>
                {v.journey.map((e) => (
                  <li key={e.id}>
                    <span className={`feed-dot ${dotClass(e)}`} aria-hidden />
                    <time dateTime={e.occurredAt}>{clock(e.occurredAt)}</time>
                    <span>
                      {what(e)}
                      {e.source === 'server' && <span className="source-tag">server</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
