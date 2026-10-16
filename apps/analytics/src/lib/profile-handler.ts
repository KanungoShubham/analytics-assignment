import type { DB } from './db';
import { getVisitorProfile } from './behaviour';
import { jsonResponse } from './http';
import { findProjectBySecretKey } from './projects';

/**
 * GET /api/profile?anonymousId=&userId= — a returning visitor's favourites.
 * Secret key only: it exposes one visitor's behaviour, so it is never called from the browser.
 */
export function handleProfile(req: Request, db: DB): Response {
  const auth = req.headers.get('authorization') ?? '';
  const secret = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const project = secret ? findProjectBySecretKey(db, secret) : null;
  if (!project) return jsonResponse({ error: 'Invalid secret key' }, 401);

  const params = new URL(req.url).searchParams;
  const clean = (v: string | null) => (v && v.length <= 200 ? v : null);
  const anonymousId = clean(params.get('anonymousId'));
  const userId = clean(params.get('userId'));
  if (!anonymousId && !userId) return jsonResponse({ error: 'anonymousId or userId is required' }, 400);

  return jsonResponse(getVisitorProfile(db, project.id, { anonymousId, userId }));
}
