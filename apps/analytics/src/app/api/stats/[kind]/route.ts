import { config } from '../../../../lib/config';
import { getDb } from '../../../../lib/db';
import { jsonResponse } from '../../../../lib/http';
import { handleStats, STAT_KINDS, type StatKind } from '../../../../lib/stats-handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!STAT_KINDS.includes(kind as StatKind)) return jsonResponse({ error: 'Not found' }, 404);
  return handleStats(req, getDb(), config.demoProject.id, kind as StatKind, config.sessionSecret);
}
