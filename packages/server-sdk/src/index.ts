import { randomUUID } from 'node:crypto';
import type { AnalyticsEvent, IngestResponse } from '@acme/shared';

export interface ServerAnalyticsOptions {
  secretKey: string;
  endpoint: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetch?: typeof fetch;
  logger?: Pick<Console, 'warn'>;
}

export interface TrackIds {
  anonymousId?: string | null;
  userId?: string | null;
}

export interface TrackResult {
  ok: boolean;
  status?: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends trusted business events (e.g. order_created) from your server.
 * track() never throws: analytics problems must not break business logic.
 */
export class ServerAnalytics {
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Pick<Console, 'warn'>;

  constructor(private readonly options: ServerAnalyticsOptions) {
    this.url = `${options.endpoint.replace(/\/+$/, '')}/api/server-events`;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 200;
    this.fetchFn = options.fetch ?? ((input, init) => fetch(input, init));
    this.logger = options.logger ?? console;
  }

  async track(name: string, properties: Record<string, unknown> = {}, ids: TrackIds = {}): Promise<TrackResult> {
    const event: AnalyticsEvent = {
      event_id: randomUUID(), // same id on every retry, so the server de-duplicates
      type: 'track',
      name,
      anonymous_id: ids.anonymousId ?? null,
      user_id: ids.userId ?? null,
      timestamp: new Date().toISOString(),
      properties,
    };
    const result = await this.send(event);
    if (!result.ok) this.logger.warn(`[acme-analytics] failed to send "${name}": ${result.error}`);
    return result;
  }

  private async send(event: AnalyticsEvent): Promise<TrackResult> {
    let last: TrackResult = { ok: false, error: 'not sent' };
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(this.retryDelayMs * 2 ** (attempt - 1));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchFn(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.options.secretKey}` },
          body: JSON.stringify({ events: [event] }),
          signal: controller.signal,
        });
        if (res.ok) {
          const body = (await res.json().catch(() => null)) as IngestResponse | null;
          if (body?.rejected?.length) return { ok: false, status: res.status, error: body.rejected[0].error };
          return { ok: true, status: res.status };
        }
        last = { ok: false, status: res.status, error: `HTTP ${res.status}` };
        if (res.status < 500 && res.status !== 429) return last; // retrying cannot help
      } catch (err) {
        const e = err as Error;
        last = { ok: false, error: e?.name === 'AbortError' ? `timeout after ${this.timeoutMs} ms` : String(e?.message ?? err) };
      } finally {
        clearTimeout(timer);
      }
    }
    return last;
  }
}
