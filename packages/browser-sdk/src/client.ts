import type { AnalyticsEvent, EventType } from '@acme/shared';
import { Identity, uuid } from './identity';
import { PersistentQueue } from './queue';
import { backoffDelay, sendBatch, sendWithBeacon } from './transport';
import { watchLocation } from './history';

export interface BrowserConfig {
  publicKey: string;
  endpoint: string;
  autoPageViews?: boolean;
  flushInterval?: number;
  maxBatchSize?: number;
  debug?: boolean;
  respectDoNotTrack?: boolean;
  fetch?: typeof fetch;
}

type Props = Record<string, unknown>;
const MAX_REQUEST_EVENTS = 50; // server limit
const MAX_REQUEST_BYTES = 60_000; // stay under the server's 64 KB body limit

export class AnalyticsClient {
  private readonly cfg: Required<BrowserConfig>;
  private readonly identity = new Identity();
  private readonly queue = new PersistentQueue('acme_queue');
  private timer: ReturnType<typeof setInterval> | null = null;
  private cleanups: (() => void)[] = [];
  private inFlight: Promise<void> | null = null;
  private attempt = 0;
  private retryAt = 0;
  private lastPath: string | null = null;
  private lastHref: string | null = null;

  constructor(config: BrowserConfig) {
    this.cfg = {
      autoPageViews: true,
      flushInterval: 5000,
      maxBatchSize: 20,
      debug: false,
      respectDoNotTrack: true,
      ...config,
      endpoint: config.endpoint.replace(/\/+$/, ''),
      fetch: config.fetch ?? ((input, init) => fetch(input, init)),
    };
  }

  private get collectUrl(): string {
    return `${this.cfg.endpoint}/api/collect`;
  }

  private get disabled(): boolean {
    const dnt = this.cfg.respectDoNotTrack && typeof navigator !== 'undefined' && navigator.doNotTrack === '1';
    return dnt || this.identity.isOptedOut();
  }

  start(): void {
    this.timer = setInterval(() => void this.flush(), this.cfg.flushInterval);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') this.flushWithBeacon();
    };
    const onPageHide = () => this.flushWithBeacon();
    const onOnline = () => {
      this.retryAt = 0;
      void this.flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    this.cleanups.push(
      () => document.removeEventListener('visibilitychange', onVisibility),
      () => window.removeEventListener('pagehide', onPageHide),
      () => window.removeEventListener('online', onOnline),
    );

    // Leftovers from a previous page load are sent right away; new events wait for the next batch.
    const hasLeftovers = this.queue.size > 0;
    if (this.cfg.autoPageViews) {
      this.cleanups.push(watchLocation(() => this.autoPageView()));
      this.autoPageView();
    }
    if (hasLeftovers) void this.flush();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
  }

  private autoPageView(): void {
    if (location.pathname !== this.lastPath) this.page();
  }

  page(properties: Props = {}): void {
    const referrer = this.lastHref ?? (document.referrer || null);
    this.lastPath = location.pathname;
    this.lastHref = location.href;
    this.enqueue('page_view', 'page_view', properties, { title: document.title || null, referrer });
  }

  track(name: string, properties: Props = {}): void {
    this.enqueue('track', name, properties);
  }

  identify(userId: string, traits: Props = {}): void {
    this.identity.setUserId(userId);
    this.enqueue('identify', 'identify', traits);
  }

  reset(): void {
    this.identity.reset();
  }

  optOut(): void {
    this.identity.setOptOut(true);
    this.queue.clear();
  }

  optIn(): void {
    this.identity.setOptOut(false);
  }

  getAnonymousId(): string {
    return this.identity.getAnonymousId();
  }

  private enqueue(type: EventType, name: string, properties: Props, extra: Partial<AnalyticsEvent> = {}): void {
    if (this.disabled) {
      this.log('tracking disabled (opt-out or Do Not Track), dropped', name);
      return;
    }
    const event: AnalyticsEvent = {
      event_id: uuid(),
      type,
      name,
      anonymous_id: this.identity.getAnonymousId(),
      user_id: this.identity.getUserId(),
      session_id: this.identity.getSessionId(),
      timestamp: new Date().toISOString(),
      url: location.pathname,
      title: null,
      referrer: null,
      properties,
      ...extra,
    };
    this.queue.push(event);
    this.log('queued', event);
    if (this.queue.size >= this.cfg.maxBatchSize) void this.flush();
  }

  /** Oldest events first, at most 50 and ~60 KB per request. */
  private takeBatch(): AnalyticsEvent[] {
    const batch: AnalyticsEvent[] = [];
    let bytes = 0;
    for (const event of this.queue.peek(MAX_REQUEST_EVENTS)) {
      const size = JSON.stringify(event).length;
      if (batch.length > 0 && bytes + size > MAX_REQUEST_BYTES) break;
      batch.push(event);
      bytes += size;
    }
    return batch;
  }

  /** Sends one batch. Only one request is in flight at a time; respects retry backoff. */
  flush(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (Date.now() < this.retryAt) return Promise.resolve();
    const batch = this.takeBatch();
    if (batch.length === 0) return Promise.resolve();
    this.inFlight = this.send(batch).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async send(batch: AnalyticsEvent[]): Promise<void> {
    const result = await sendBatch(this.cfg.fetch, this.collectUrl, this.cfg.publicKey, batch);
    if (result === 'retry') {
      this.attempt++;
      const delay = backoffDelay(this.attempt);
      this.retryAt = Date.now() + delay;
      this.log(`send failed, retrying in ${delay} ms (attempt ${this.attempt})`);
      return;
    }
    if (result === 'drop') this.log(`server rejected batch, dropping ${batch.length} events`);
    this.attempt = 0;
    this.retryAt = 0;
    this.queue.remove(batch.map((e) => e.event_id));
    if (this.queue.size >= this.cfg.maxBatchSize) setTimeout(() => void this.flush(), 0);
  }

  /**
   * Page is being hidden/closed: hand the queue to the browser via sendBeacon.
   * Events stay queued; if they are sent again later the server de-duplicates by event_id.
   */
  private flushWithBeacon(): void {
    const batch = this.takeBatch();
    if (batch.length > 0) sendWithBeacon(this.collectUrl, this.cfg.publicKey, batch);
  }

  private log(...args: unknown[]): void {
    if (this.cfg.debug) console.log('[acme-analytics]', ...args);
  }
}
