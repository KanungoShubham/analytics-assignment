import { getCookie, setCookie, storage } from './storage';

const ANON_KEY = 'acme_anon_id';
const SESSION_KEY = 'acme_session';
const USER_KEY = 'acme_user_id';
const OPT_OUT_KEY = 'acme_opt_out';
const ONE_YEAR_S = 365 * 24 * 60 * 60;
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** RFC 4122 v4 id. crypto.randomUUID is missing on plain-http (non-secure) pages, so fall back. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class Identity {
  getAnonymousId(): string {
    let id = storage.get(ANON_KEY);
    if (!id) {
      id = getCookie(ANON_KEY) ?? `anon_${uuid()}`;
      storage.set(ANON_KEY, id);
      setCookie(ANON_KEY, id, ONE_YEAR_S);
    }
    return id;
  }

  /** Returns the current session id, starting a new one after 30 minutes of inactivity. */
  getSessionId(now = Date.now()): string {
    let session: { id: string; lastActivity: number } | null = null;
    try {
      session = JSON.parse(storage.get(SESSION_KEY) ?? 'null');
    } catch {
      session = null;
    }
    if (!session || typeof session.id !== 'string' || now - session.lastActivity > SESSION_TIMEOUT_MS) {
      session = { id: `sess_${uuid()}`, lastActivity: now };
    } else {
      session.lastActivity = now;
    }
    storage.set(SESSION_KEY, JSON.stringify(session));
    return session.id;
  }

  getUserId(): string | null {
    return storage.get(USER_KEY);
  }

  setUserId(userId: string): void {
    storage.set(USER_KEY, userId);
  }

  /** Logout: forget the user and start a fresh anonymous identity so the next person is not linked. */
  reset(): void {
    storage.remove(USER_KEY);
    storage.remove(ANON_KEY);
    storage.remove(SESSION_KEY);
    setCookie(ANON_KEY, '', 0);
  }

  isOptedOut(): boolean {
    return storage.get(OPT_OUT_KEY) === '1';
  }

  setOptOut(value: boolean): void {
    if (value) storage.set(OPT_OUT_KEY, '1');
    else storage.remove(OPT_OUT_KEY);
  }
}
