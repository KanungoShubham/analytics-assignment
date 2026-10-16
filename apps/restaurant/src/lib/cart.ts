'use client';
import { useCallback, useEffect, useState } from 'react';

export interface CartLine {
  itemId: string;
  quantity: number;
}

const KEY = 'restaurant_cart';
const EVENT = 'cart-change';

function read(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((itemId: string) => {
    const current = read();
    const line = current.find((l) => l.itemId === itemId);
    if (line) line.quantity = Math.min(20, line.quantity + 1);
    else current.push({ itemId, quantity: 1 });
    write(current);
  }, []);

  const decrement = useCallback((itemId: string) => {
    const next = read()
      .map((l) => (l.itemId === itemId ? { ...l, quantity: l.quantity - 1 } : l))
      .filter((l) => l.quantity > 0);
    write(next);
  }, []);

  const remove = useCallback((itemId: string) => write(read().filter((l) => l.itemId !== itemId)), []);
  const clear = useCallback(() => write([]), []);
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  return { lines, count, add, decrement, remove, clear };
}
