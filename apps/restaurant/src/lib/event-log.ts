'use client';
import type { AnalyticsEvent } from '@acme/shared';

/**
 * Keeps the most recent events the browser SDK queued, so the demo's event panel
 * can show them even if they were tracked before the panel mounted.
 */
const MAX = 8;
let events: AnalyticsEvent[] = [];
let total = 0;
let snapshot = { events, total };
const listeners = new Set<() => void>();

export function recordEvent(event: AnalyticsEvent): void {
  events = [event, ...events].slice(0, MAX);
  total += 1;
  snapshot = { events, total };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = () => snapshot;

const empty = { events: [] as AnalyticsEvent[], total: 0 };
export const getServerSnapshot = () => empty;
