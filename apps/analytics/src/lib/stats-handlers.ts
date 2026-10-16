import type { DB } from './db';
import { readCookie, SESSION_COOKIE, verifySessionToken } from './auth';
import { jsonResponse } from './http';
import { getEventTrends, getOverview, getTimeseries, getTopPages, InvalidRangeError, parseRange } from './stats';

export const STAT_KINDS = ['overview', 'timeseries', 'top-pages', 'events'] as const;
export type StatKind = (typeof STAT_KINDS)[number];

export function handleStats(req: Request, db: DB, projectId: string, kind: StatKind, secret: string): Response {
  if (!verifySessionToken(readCookie(req, SESSION_COOKIE), secret)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  try {
    const params = new URL(req.url).searchParams;
    const range = parseRange(params);
    switch (kind) {
      case 'overview':
        return jsonResponse(getOverview(db, projectId, range));
      case 'timeseries':
        return jsonResponse(getTimeseries(db, projectId, range));
      case 'top-pages': {
        const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 10));
        return jsonResponse(getTopPages(db, projectId, range, limit));
      }
      case 'events':
        return jsonResponse(getEventTrends(db, projectId, range));
    }
  } catch (err) {
    if (err instanceof InvalidRangeError) return jsonResponse({ error: err.message }, 400);
    throw err;
  }
}
