'use client';
import { useCallback, useEffect, useState } from 'react';
import { identify, reset } from '@acme/browser-sdk';

const KEY = 'restaurant_user';
const EVENT = 'user-change';

export interface DemoUser {
  id: string;
  name: string;
}

function read(): DemoUser | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

/** Fake login for the demo: no password, the name becomes a stable user id. */
export function useUser() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(read());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const login = useCallback((name: string) => {
    const u = { id: `user_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, name: name.trim() };
    localStorage.setItem(KEY, JSON.stringify(u));
    identify(u.id, { name: u.name });
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    reset();
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { user, login, logout };
}
