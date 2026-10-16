import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'dash_session';
const TTL_MS = 8 * 60 * 60 * 1000;

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('hex');

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Token = "<expiry ms>.<hmac(expiry)>". Stateless: no session table needed. */
export function createSessionToken(secret: string, now = Date.now()): string {
  const expiry = String(now + TTL_MS);
  return `${expiry}.${sign(expiry, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token) return false;
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature) return false;
  if (!safeEqual(signature, sign(expiry, secret))) return false;
  return Number(expiry) > now;
}

/** Hash both sides first so the comparison is constant-time regardless of length. */
export function checkPassword(input: string, expected: string): boolean {
  const h = (s: string) => createHash('sha256').update(s).digest('hex');
  return input.length > 0 && safeEqual(h(input), h(expected));
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_MS / 1000}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
