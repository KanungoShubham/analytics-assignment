import { eventSchema, formatZodError, type EventSource, type IngestResponse } from '@acme/shared';
import type { DB } from './db';

const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
const MAX_PAST_MS = 7 * 24 * 60 * 60 * 1000;

/** Trust the client timestamp unless its clock is clearly wrong. Always returns UTC ISO. */
export function normaliseOccurredAt(clientTs: string, receivedAt: Date): string {
  const t = Date.parse(clientTs);
  const now = receivedAt.getTime();
  if (Number.isNaN(t) || t > now + MAX_FUTURE_MS || t < now - MAX_PAST_MS) return receivedAt.toISOString();
  return new Date(t).toISOString();
}

export interface IngestInput {
  projectId: string;
  source: EventSource;
  events: unknown[];
  userAgent?: string | null;
  now?: Date;
}

export function ingestEvents(db: DB, input: IngestInput): IngestResponse {
  const receivedAt = input.now ?? new Date();
  const result: IngestResponse = { accepted: 0, duplicates: 0, rejected: [] };
  const rows: Record<string, unknown>[] = [];

  input.events.forEach((raw, index) => {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) {
      result.rejected.push({ index, error: formatZodError(parsed.error) });
      return;
    }
    const e = parsed.data;
    if (input.source === 'browser' && !e.anonymous_id) {
      result.rejected.push({ index, error: 'anonymous_id: required for browser events' });
      return;
    }
    rows.push({
      event_id: e.event_id,
      project_id: input.projectId,
      type: e.type,
      name: e.name,
      source: input.source,
      anonymous_id: e.anonymous_id ?? null,
      user_id: e.user_id ?? null,
      session_id: e.session_id ?? null,
      url: e.url ?? null,
      title: e.title ?? null,
      referrer: e.referrer ?? null,
      user_agent: input.userAgent ? input.userAgent.slice(0, 512) : null,
      properties: JSON.stringify(e.properties),
      occurred_at: normaliseOccurredAt(e.timestamp, receivedAt),
      received_at: receivedAt.toISOString(),
    });
  });

  // INSERT OR IGNORE + UNIQUE(project_id, event_id) makes retries safe (idempotent).
  const insert = db.prepare(
    `INSERT OR IGNORE INTO events
       (event_id, project_id, type, name, source, anonymous_id, user_id, session_id,
        url, title, referrer, user_agent, properties, occurred_at, received_at)
     VALUES
       (@event_id, @project_id, @type, @name, @source, @anonymous_id, @user_id, @session_id,
        @url, @title, @referrer, @user_agent, @properties, @occurred_at, @received_at)`,
  );
  db.transaction(() => {
    for (const row of rows) {
      if (insert.run(row).changes === 1) result.accepted++;
      else result.duplicates++;
    }
  })();

  return result;
}
