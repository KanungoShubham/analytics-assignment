'use client';
import { useState, useSyncExternalStore } from 'react';
import type { AnalyticsEvent } from '@acme/shared';
import { getServerSnapshot, getSnapshot, subscribe } from '../lib/event-log';

const label = (e: AnalyticsEvent) => (e.type === 'page_view' ? 'page view' : e.name.replace(/_/g, ' '));
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Shows the events the browser SDK is sending, so a reviewer can watch tracking happen. */
export function EventPanel({ dashboardUrl }: { dashboardUrl: string }) {
  const { events, total } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);

  return (
    <aside className="ev-panel" aria-label="Analytics events sent by this page">
      <button className="ev-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {/* Re-keyed on every event so the ping animation replays. */}
        <span key={total} className={`ev-dot ${total ? 'ping' : ''}`} aria-hidden />
        Analytics events
        <span className="ev-count">{total} tracked {open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <>
          {events.length === 0 ? (
            <div className="ev-empty">Browse the menu or add a dish to see events appear here.</div>
          ) : (
            <ul className="ev-list">
              {events.map((e) => (
                <li className="ev-item" key={e.event_id}>
                  <span className={`ev-badge ${e.type}`}>{label(e)}</span>
                  <span className="ev-where">{e.url}</span>
                  <span className="ev-time">{time(e.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="ev-foot">
            Sent in batches every few seconds. <a href={dashboardUrl} target="_blank" rel="noreferrer">See them on the dashboard</a>
          </div>
        </>
      )}
    </aside>
  );
}
