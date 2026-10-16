import { describe, it, expect } from 'vitest';
import { checkPassword, createSessionToken, readCookie, verifySessionToken } from '../src/lib/auth';

describe('session tokens', () => {
  it('verifies a fresh token and rejects tampered or expired ones', () => {
    const token = createSessionToken('secret', 1_000);
    expect(verifySessionToken(token, 'secret', 2_000)).toBe(true);
    expect(verifySessionToken(token, 'other-secret', 2_000)).toBe(false);
    expect(verifySessionToken(token.replace(/^\d+/, '99999999999999'), 'secret', 2_000)).toBe(false);
    expect(verifySessionToken(token, 'secret', 1_000 + 9 * 60 * 60 * 1000)).toBe(false);
    expect(verifySessionToken(undefined, 'secret')).toBe(false);
    expect(verifySessionToken('garbage', 'secret')).toBe(false);
  });
});

describe('checkPassword', () => {
  it('compares passwords', () => {
    expect(checkPassword('admin', 'admin')).toBe(true);
    expect(checkPassword('admin2', 'admin')).toBe(false);
    expect(checkPassword('', 'admin')).toBe(false);
  });
});

describe('readCookie', () => {
  it('reads a named cookie', () => {
    const req = new Request('http://x', { headers: { cookie: 'a=1; dash_session=abc.def; b=2' } });
    expect(readCookie(req, 'dash_session')).toBe('abc.def');
    expect(readCookie(req, 'missing')).toBeUndefined();
  });
});
