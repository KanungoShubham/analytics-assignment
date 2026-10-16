import { describe, it, expect, beforeEach } from 'vitest';
import { Identity, SESSION_TIMEOUT_MS } from '../src/identity';

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'acme_anon_id=; Max-Age=0; Path=/';
});

describe('Identity', () => {
  it('creates and persists an anonymous id across instances', () => {
    const id = new Identity().getAnonymousId();
    expect(id).toMatch(/^anon_/);
    expect(new Identity().getAnonymousId()).toBe(id);
  });
  it('falls back to the cookie when localStorage was cleared', () => {
    const id = new Identity().getAnonymousId();
    localStorage.clear();
    expect(new Identity().getAnonymousId()).toBe(id);
  });
  it('keeps the session while active and rotates after 30 minutes idle', () => {
    const identity = new Identity();
    const s1 = identity.getSessionId(0);
    expect(identity.getSessionId(SESSION_TIMEOUT_MS - 1)).toBe(s1);
    expect(identity.getSessionId(2 * SESSION_TIMEOUT_MS)).not.toBe(s1);
  });
  it('reset() clears user id and issues a new anonymous id', () => {
    const identity = new Identity();
    const anon = identity.getAnonymousId();
    identity.setUserId('user_1');
    identity.reset();
    expect(identity.getUserId()).toBeNull();
    expect(identity.getAnonymousId()).not.toBe(anon);
  });
});
