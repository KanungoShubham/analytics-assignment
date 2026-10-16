import { getDb } from '../../../lib/db';
import { handleServerEvents } from '../../../lib/ingest-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return handleServerEvents(req, getDb());
}
