import { clearSessionCookieHeader } from '../../../lib/auth';

export function POST() {
  return new Response(null, { status: 303, headers: { Location: '/login', 'Set-Cookie': clearSessionCookieHeader() } });
}
