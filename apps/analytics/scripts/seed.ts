/**
 * Fills the demo project with 30 days of realistic sample events.
 * Usage: npm run seed            (adds data)
 *        npm run seed -- --reset (deletes demo events first)
 */
import { randomUUID } from 'node:crypto';
import { config } from '../src/lib/config';
import { getDb } from '../src/lib/db';
import { ingestEvents } from '../src/lib/ingest';

const DAY_MS = 86_400_000;
const PAGES = ['/', '/', '/menu', '/menu', '/menu', '/cart', '/checkout', '/login'];
const DISHES = [
  { id: 'margherita', price: 12.5 }, { id: 'carbonara', price: 14 }, { id: 'tiramisu', price: 7 }, { id: 'bruschetta', price: 8 },
];
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

const db = getDb();
const projectId = config.demoProject.id;
if (process.argv.includes('--reset')) db.prepare('DELETE FROM events WHERE project_id = ?').run(projectId);

let total = 0;
const today = Date.parse(new Date().toISOString().slice(0, 10));
for (let d = 29; d >= 0; d--) {
  const dayStart = today - d * DAY_MS;
  const weekend = [0, 6].includes(new Date(dayStart).getUTCDay());
  const visitors = Math.floor((weekend ? 30 : 18) + Math.random() * 15);
  const browser: unknown[] = [];
  const server: unknown[] = [];

  for (let v = 0; v < visitors; v++) {
    const anon = `anon_${randomUUID()}`;
    const session = `sess_${randomUUID()}`;
    let t = dayStart + Math.random() * (DAY_MS - 60 * 60 * 1000);
    const at = () => new Date((t += 20_000 + Math.random() * 60_000)).toISOString();
    const base = { anonymous_id: anon, session_id: session };

    for (let p = 0, n = 1 + Math.floor(Math.random() * 4); p < n; p++) {
      browser.push({ ...base, event_id: randomUUID(), type: 'page_view', name: 'page_view', url: pick(PAGES), timestamp: at() });
    }
    if (Math.random() < 0.45) {
      const dish = pick(DISHES);
      browser.push({ ...base, event_id: randomUUID(), type: 'track', name: 'add_to_cart', url: '/menu', timestamp: at(), properties: { itemId: dish.id, price: dish.price } });
      if (Math.random() < 0.6) {
        browser.push({ ...base, event_id: randomUUID(), type: 'track', name: 'checkout_started', url: '/checkout', timestamp: at() });
        if (Math.random() < 0.7) {
          server.push({ event_id: randomUUID(), type: 'track', name: 'order_created', anonymous_id: anon, timestamp: at(), properties: { orderId: `ord_seed_${randomUUID().slice(0, 8)}`, total: dish.price, itemCount: 1 } });
        }
      }
    }
  }
  // "now" = end of that day so the clock-skew guard keeps the historical timestamps.
  const now = new Date(dayStart + DAY_MS - 1);
  total += ingestEvents(db, { projectId, source: 'browser', events: browser, now }).accepted;
  total += ingestEvents(db, { projectId, source: 'server', events: server, now }).accepted;
}
console.log(`Seeded ${total} events into project "${projectId}" (${config.dbPath}).`);
