import { getDb } from '../../../lib/db';
import { handleCollect, handleCollectPreflight } from '../../../lib/ingest-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handleCollectPreflight(req);
}

export function POST(req: Request) {
  return handleCollect(req, getDb());
}
