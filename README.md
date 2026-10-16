# Analytics SDK & Dashboard

A small, end-to-end analytics system:

- **Browser SDK** (`@acme/browser-sdk`): tracks page views and custom events, with batching, retries, an offline queue and delivery when the page closes.
- **Server SDK** (`@acme/server-sdk`): sends trusted business events (for example `order_created`) from a backend.
- **Ingestion + storage** (`apps/analytics`): a validated, idempotent HTTP API backed by SQLite.
- **Dashboard** (`apps/analytics` → `/dashboard`): page views, unique visitors, sessions, orders and revenue with change vs the previous period. It also has **Live now** (who is on the site, their current page and last action, plus each visitor's full journey), **Popular dishes** (added to cart / people / ordered), a traffic chart, an ordering funnel, a recent-activity feed, event trends and popular pages. Everything is filtered by date range and refreshes every 10 s while Live is on.
- **Demo app** (`apps/restaurant`): a small restaurant site that uses both SDKs. You browse the menu, add dishes, log in, place an order and see it on the dashboard. Customers never see analytics. Returning visitors get a **"Welcome back — your usual"** row built from their own past behaviour.

```
Restaurant site (localhost:3001)                   Analytics app (localhost:3000)
┌────────────────────────────┐                     ┌──────────────────────────────┐
│ Browser SDK                │ POST /api/collect   │ validate → dedupe → insert   │
│  page_view (auto), track,  │ ──────────────────▶ │            │                 │
│  identify                  │  public key + Origin│            ▼                 │
│                            │                     │      SQLite (events)         │
│ POST /api/orders (server)  │ POST /api/server-   │            │                 │
│  Server SDK: order_created │ ──events──────────▶ │            ▼                 │
│  (sent after the response) │  secret key         │ /api/stats/*  +  /dashboard  │
└────────────────────────────┘                     └──────────────────────────────┘
```

## Quick start

Requirements: **Node.js 20+** and npm. You don't need to install a database, PHP or Docker.

```bash
npm install          # installs every workspace (SQLite is bundled via better-sqlite3)
npm run seed         # optional: 30 days of sample data so the charts aren't empty
npm run dev          # analytics on :3000, restaurant on :3001
npm test             # all test suites
```

- Restaurant demo: http://localhost:3001
- Dashboard: http://localhost:3000. The password is **`admin`**.

Everything works without `.env` files because the demo defaults are built in. To change keys or the password, copy `apps/analytics/.env.example` to `apps/analytics/.env` and `apps/restaurant/.env.example` to `apps/restaurant/.env`.

The database is created automatically at `apps/analytics/data/analytics.db`. Delete that file to start over, or run `npm run seed -- --reset`.

## Demo walkthrough

1. Open http://localhost:3001 and go to **Menu**. Each page change sends a `page_view`.
2. Click **Add** on two dishes. Each click sends `add_to_cart`.
3. Click **Log in** and enter any name. This calls `identify()`, which links the anonymous visitor to `user_<name>`.
4. Go to **Cart → Checkout**. This sends `checkout_started`.
5. Click **Place order**. The restaurant server saves the order, then sends `order_created` through the **server SDK**, along with the visitor's `anonymous_id`.
6. Open the dashboard and choose **Today**. Page views, unique visitors, sessions, orders, revenue, the event chart and popular pages all include your visit. Browser events are sent in batches, so allow up to 5 seconds, or until you switch tabs.
7. Optional failure test: stop the analytics app (port 3000) and place another order. The order still succeeds immediately, and the restaurant logs `failed to send "order_created"`.

With `debug: true` (the demo turns it on in development), the browser console shows `[acme-analytics] queued …` for every event.

## Integrating the Browser SDK

```ts
import { init, track, identify, reset, getAnonymousId } from '@acme/browser-sdk';

init({
  publicKey: 'pk_demo_123',
  endpoint: 'http://localhost:3000',
  // optional: autoPageViews (true), flushInterval (5000 ms), maxBatchSize (20),
  //           debug (false), respectDoNotTrack (true), onEvent (callback per queued event)
});

track('add_to_cart', { itemId: 'margherita', price: 12.5 });
identify('user_42', { name: 'Asha' });   // after login
reset();                                 // on logout
getAnonymousId();                        // pass to your server to link server events
```

- Page views are tracked automatically, on first load and on single-page-app navigation (`pushState`, `replaceState`, `popstate`).
- It does nothing during server-side rendering, and **never throws** into your app.
- It also provides `page()`, `flush()`, `optOut()` and `optIn()`.

## Integrating the Server SDK

```ts
import { ServerAnalytics } from '@acme/server-sdk';

const analytics = new ServerAnalytics({ secretKey: process.env.ANALYTICS_SECRET_KEY!, endpoint: 'http://localhost:3000' });

const result = await analytics.track('order_created', { orderId, total }, { anonymousId, userId });
// result: { ok: boolean, status?, error? } (never throws)
```

In Next.js, call it inside `after(() => analytics.track(...))` so it runs after the response has been sent (see `apps/restaurant/src/app/api/orders/route.ts`).

## API

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/collect` | public key (body `publicKey` or `X-Analytics-Key`) **and** an allowed `Origin` | Browser events |
| `POST /api/server-events` | `Authorization: Bearer <secret key>` | Server events |
| `GET /api/stats/overview?from&to` | dashboard cookie | Page views, unique visitors, sessions, events, orders, revenue |
| `GET /api/stats/timeseries?from&to` | dashboard cookie | Page views and unique visitors per day (days with no data are filled with zeros) |
| `GET /api/stats/top-pages?from&to&limit` | dashboard cookie | Most viewed pages |
| `GET /api/stats/events?from&to` | dashboard cookie | Custom event counts per day |
| `GET /api/profile?anonymousId&userId` | `Authorization: Bearer <secret key>` | A returning visitor's visits and favourite dishes (used for "your usual") |
| `POST /api/login`, `POST /api/logout` | password | Dashboard session |

Ingestion request body: `{ "events": [ ...1 to 50 events ] }`, at most 64 KB.

The response is `202 { accepted, duplicates, rejected: [{ index, error }] }`. Each event is validated on its own, so one bad event doesn't reject the rest of the batch.

Error codes: `400` invalid JSON or envelope, `401` bad key, `403` origin not allowed, `413` body too large, `429` rate limited (with `Retry-After`).

`from` and `to` are dates in `YYYY-MM-DD` format (UTC). Both days are included, and a range can cover at most 366 days. The default is the last 7 days.

```bash
curl -X POST http://localhost:3000/api/server-events \
  -H "Authorization: Bearer sk_demo_456" -H "Content-Type: application/json" \
  -d '{"events":[{"event_id":"6f1c2b8e-4a3d-4c1e-9b7a-2d5e8f0a1b2c","type":"track","name":"order_created","user_id":"user_1","timestamp":"2026-10-16T10:00:00Z","properties":{"total":20}}]}'
```

## Event schema

```jsonc
{
  "event_id": "uuid",            // created by the SDK; used to drop duplicates
  "type": "page_view | track | identify",
  "name": "add_to_cart",         // 1-100 chars: letters, digits, _ . : -
  "anonymous_id": "anon_…",      // required for browser events
  "user_id": "user_42",          // after identify()
  "session_id": "sess_…",
  "timestamp": "ISO 8601",       // client time
  "url": "/menu", "title": "…", "referrer": "…",
  "properties": { }              // JSON object, at most 8 KB
}
```

The server adds `source` (`browser` or `server`), `received_at`, `occurred_at` and `user_agent`. The shared Zod schema is in `packages/shared/src/schema.ts`.

**Database** (`apps/analytics/src/lib/db.ts`):
- `projects`: keys, the hashed secret, allowed origins.
- `events`: one row per event, with `UNIQUE(project_id, event_id)` and indexes on `(project_id, occurred_at)` and `(project_id, name, occurred_at)`.

## Identity model

| ID | Where it lives | Lifetime | Used for |
|---|---|---|---|
| `anonymous_id` | `localStorage`, with a first-party cookie as backup | Until `reset()` or cleared storage | **Unique visitors** |
| `session_id` | `localStorage` | Renewed after 30 minutes of inactivity | **Sessions** |
| `user_id` | Set by `identify()` | Until `reset()` | Linking to a known user |

Server events carry the `anonymous_id` that the browser sends with the order, so `order_created` links to the visitor's browsing journey. `reset()` on logout creates a new `anonymous_id`, so the next person on the same device isn't merged with the last one.

## Key decisions

- **Next.js full-stack instead of Laravel.** Laravel/PHP was the preferred backend. We chose a single framework and language (TypeScript) for the SDKs, API and UI because it makes the whole system easier to follow, and the development machine had Node but no PHP. The HTTP contract doesn't depend on the framework, so the backend could be ported to Laravel without changing either SDK.
- **SQLite (better-sqlite3), plain SQL, no ORM.** Nothing to install, a single file, and every query is easy to read. WAL mode allows reads while writing, and each batch is inserted in one transaction.
- **Idempotency by `event_id`.** The SDKs retry and the page-close beacon may send events twice. `INSERT OR IGNORE` on `(project_id, event_id)` makes resending safe.
- **`text/plain` request bodies.** These count as a "simple" CORS request, so the browser skips the extra preflight request. It's also the same format `sendBeacon` uses.
- **Echo `Origin` on `/api/collect`.** The endpoint only accepts writes, so this is safe. It lets the SDK read a `401` or `403` and drop the batch instead of retrying a CORS error forever. The allowed-origin check itself happens on the server.
- **Retry rules.** Network errors, `429` and `5xx` are retried with exponential backoff (1 s, 2 s, 4 s … up to 30 s, plus jitter). Any other `4xx` drops the batch, because resending can't succeed.
- **Server tracking runs after the response** (`after()`). A slow or failed analytics call never delays or breaks an order.
- **Personalisation goes through the server.** The menu asks the restaurant server (`/api/favorites`), which calls `GET /api/profile` with the secret key. The browser never holds a key that can read behaviour. A 1.5 s timeout means the menu never waits on analytics.
- **Prices are calculated on the server** from the menu. Prices sent by the client are ignored.
- **Stateless dashboard session.** The cookie is an HMAC-signed expiry time (HttpOnly, SameSite=Lax), so no session table is needed.
- **Timestamps.** The client's time is used, unless it is more than 24 h in the future or more than 7 days in the past, in which case the server's receive time is used. All reporting uses UTC days.

## Failure handling

| What fails | What happens |
|---|---|
| Network error, analytics `5xx` or `429` | Events stay in the queue and are retried with backoff. Coming back online triggers an immediate retry. |
| Page reloaded or closed while offline | The queue is saved in `localStorage` (max 500 events, oldest dropped first) and sent on the next page load. |
| Tab hidden or page closing | The queue is handed to `navigator.sendBeacon`. If it's sent again later, the server's duplicate check ignores the copy. |
| `localStorage` unavailable (private mode, quota) | Falls back to in-memory storage. Tracking still works for that page. |
| Bad key, wrong origin, malformed batch | The server returns `4xx`. The SDK drops the batch and logs the reason in debug mode. |
| Some events in a batch are invalid | Only those are rejected (`rejected[]` gives index and reason). The rest are stored. |
| Analytics server down while ordering | The order still succeeds. The server SDK times out after 2 s, retries twice, logs a warning and never throws. |
| SDK bug | Every public function is wrapped, so the host page never sees an exception. |

## Security

- **Public vs secret keys.** The public key only allows writing *browser* events from allowed origins. Business events need the secret key, which is stored as a SHA-256 hash and never sent to the browser.
- **Origin allow-list** on browser ingestion. Note that the public key is visible by design and non-browser clients can fake the `Origin` header, so this protects against other *websites*, not scripts.
- **Validation and size limits** on everything: Zod schema, 50 events and 64 KB per request, 8 KB of properties per event, field length limits.
- **Rate limiting**: 120 requests/min per (key, IP) on ingestion, and 10 login attempts/min per IP. The IP comes from `X-Forwarded-For`, so this is only reliable behind a proxy that sets that header (see Limitations).
- **Business KPIs trust only server events.** Orders and revenue count `order_created` events only when they came from the server (secret key), so the public browser key can't fake revenue.
- **Privacy**: IP addresses are never stored. The SDK respects Do Not Track and supports `optOut()`.
- **Dashboard**: password compared in constant time, HMAC-signed HttpOnly cookie that expires after 8 hours, every stats route checks the session.
- **SQL**: only parameterised statements.

## Performance

- The browser batches events (every 5 s or 20 events, at most 50 events / 60 KB per request) and keeps only one request in flight.
- Each batch is one SQLite transaction. Duplicate checks use the unique index.
- Dashboard queries filter on `(project_id, occurred_at)` indexes and aggregate in SQL when the page loads. The dashboard reads directly from the database in a server component, with no extra HTTP round-trips.
- The browser SDK has no runtime dependencies (it imports only types from `@acme/shared`).

## Testing

`npm test` runs Vitest in every workspace:

| Suite | Covers |
|---|---|
| `packages/shared` | Schema: names, required IDs, 8 KB properties limit, batch size |
| `packages/browser-sdk` (jsdom, fake timers) | Batching by time and size, retry/backoff, 4xx drop, offline queue surviving reload, `sendBeacon` on page hide, identify/reset, auto page views on `pushState`, opt-out/DNT, `localStorage` throwing, never throwing |
| `packages/server-sdk` | Bearer key, retry on 5xx with the same `event_id`, no retry on 401, timeout, never throwing, rejected events |
| `apps/analytics` | Projects/keys, ingestion (partial batches, duplicates, clock skew), HTTP handlers (401/403/400/413/429, CORS), rate limiter, stats queries (fixed data, date boundaries, zero-filled days), `parseRange`, auth tokens, stats auth, plus **an end-to-end test** (browser SDK + server SDK → real handlers → stats) |
| `apps/restaurant` | Server-side pricing, validation, deferred `order_created` with IDs, order succeeds when analytics fails |

`npm run typecheck` type-checks every workspace.

## Assumptions

- One demo project, although the schema supports several projects.
- "User activity" means custom events plus identified users. "Order created" is a server-side business event.
- Reporting is in UTC days. Unique visitors = distinct browser `anonymous_id`s in the range. Sessions = distinct `session_id`s.
- `url` stores the path only (no query string), so popular pages group cleanly.
- The demo login is fake: a name only, no password.

## Limitations and next steps

- **SQLite allows only one writer at a time.** For real traffic, move ingestion behind a queue and store events in Postgres or ClickHouse.
- **Totals are calculated when the dashboard loads.** At scale, add daily summary tables.
- **The rate limiter lives in memory**, per process. Use Redis when running several servers. Without a trusted proxy in front, a client can send a different `X-Forwarded-For` each time and avoid the per-IP limit. In production, use the IP that the trusted proxy provides.
- **No CSRF tokens on dashboard login/logout.** `SameSite=Lax` cookies cover the common cases.
- **The server SDK has no durable outbox.** If every retry fails, the event is lost. Production would use an outbox table or a queue.
- **Multiple tabs share one `localStorage` queue without locking.** Two tabs can overwrite each other's queue, which can lose a few events. Duplicates are already handled on the server.
- **Unique visitors aren't merged across devices**, and `identify()` doesn't retroactively merge anonymous history in the counts.
- **The dashboard uses one shared password**, with no user accounts or roles. The cookie doesn't set `Secure`, because local development uses http.
- **Demo orders are kept in memory** and disappear on restart. The `userId` on an order comes from the client; a real app would take it from the server session.
- **No bot filtering, geography, device or referrer reports**, and no live updates (reload the dashboard).
- **The SDK packages are used as TypeScript source** inside the monorepo. Publishing to npm would need a build step (for example `tsup`).

## Project structure

```
packages/
  shared/        event types, limits, Zod schemas
  browser-sdk/   storage · identity · queue · transport · history · client · index
  server-sdk/    ServerAnalytics
apps/
  analytics/     src/lib (db, projects, ingest, ingest-handlers, stats, auth, rate-limit, http)
                 src/app (api/collect, api/server-events, api/stats/[kind], login, dashboard)
                 scripts/seed.ts, test/
  restaurant/    src/lib (menu, orders, create-order, cart, user), src/app (pages + api/orders), test/
docs/superpowers/ design spec and implementation plan
```

## Note on AI assistance

This project was built with help from an AI coding assistant (Claude Code). I reviewed and tested all of it, and I can explain and change any part. The design spec and implementation plan in `docs/` record the decisions and the reasons for them.
