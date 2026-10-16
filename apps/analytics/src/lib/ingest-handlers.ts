import { batchSchema, formatZodError, MAX_BODY_BYTES } from '@acme/shared';
import type { DB } from './db';
import { ingestEvents } from './ingest';
import { findProjectByPublicKey, findProjectBySecretKey, type Project } from './projects';
import { clientIp, errorResponse, HttpError, jsonResponse, readJsonBody } from './http';
import { createRateLimiter, type RateLimiter } from './rate-limit';

export const ingestLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

/**
 * The collect endpoint only accepts writes and returns no private data, so we echo the
 * caller's Origin. That lets the SDK read 401/403 responses and drop the batch instead of
 * retrying a CORS failure forever. The real origin check happens below.
 */
function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Analytics-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function parseBatch(req: Request) {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  const envelope = batchSchema.safeParse(body);
  if (!envelope.success) throw new HttpError(400, formatZodError(envelope.error));
  return envelope.data;
}

function enforceRateLimit(limiter: RateLimiter, key: string, headers: Record<string, string>): Response | null {
  const rl = limiter.check(key);
  if (rl.allowed) return null;
  return jsonResponse({ error: 'Rate limit exceeded' }, 429, { ...headers, 'Retry-After': String(rl.retryAfterSec) });
}

export function handleCollectPreflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function handleCollect(req: Request, db: DB, limiter: RateLimiter = ingestLimiter): Promise<Response> {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);
  try {
    const batch = await parseBatch(req);
    const key = req.headers.get('x-analytics-key') ?? batch.publicKey;
    const project: Project | null = key ? findProjectByPublicKey(db, key) : null;
    if (!project) throw new HttpError(401, 'Invalid public key');
    if (!origin || !project.allowedOrigins.includes(origin)) throw new HttpError(403, 'Origin not allowed');

    const limited = enforceRateLimit(limiter, `${project.publicKey}|${clientIp(req)}`, cors);
    if (limited) return limited;

    const result = ingestEvents(db, {
      projectId: project.id,
      source: 'browser',
      events: batch.events,
      userAgent: req.headers.get('user-agent'),
    });
    return jsonResponse(result, 202, cors);
  } catch (err) {
    return errorResponse(err, cors);
  }
}

export async function handleServerEvents(req: Request, db: DB, limiter: RateLimiter = ingestLimiter): Promise<Response> {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const secret = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const project = secret ? findProjectBySecretKey(db, secret) : null;
    if (!project) throw new HttpError(401, 'Invalid secret key');

    const limited = enforceRateLimit(limiter, `server:${project.id}|${clientIp(req)}`, {});
    if (limited) return limited;

    const batch = await parseBatch(req);
    const result = ingestEvents(db, { projectId: project.id, source: 'server', events: batch.events });
    return jsonResponse(result, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
