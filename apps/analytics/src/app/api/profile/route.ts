import { getDb } from '../../../lib/db';
import { handleProfile } from '../../../lib/profile-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return handleProfile(req, getDb());
}
