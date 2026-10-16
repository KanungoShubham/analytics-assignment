import { checkPassword, createSessionToken, sessionCookieHeader } from '../../../lib/auth';
import { config } from '../../../lib/config';
import { clientIp } from '../../../lib/http';
import { createRateLimiter } from '../../../lib/rate-limit';

export const runtime = 'nodejs';

const loginLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 303, headers: { Location: location, ...headers } });

export async function POST(req: Request) {
  if (!loginLimiter.check(clientIp(req)).allowed) return redirect('/login?error=rate');
  const form = await req.formData();
  const password = String(form.get('password') ?? '');
  if (!checkPassword(password, config.dashboardPassword)) return redirect('/login?error=1');
  return redirect('/dashboard', { 'Set-Cookie': sessionCookieHeader(createSessionToken(config.sessionSecret)) });
}
