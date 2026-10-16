import type { AnalyticsEvent } from '@acme/shared';

export type SendResult = 'ok' | 'retry' | 'drop';

/**
 * text/plain keeps this a CORS "simple request" (no preflight) and matches sendBeacon.
 * 'retry' for network errors, 429 and 5xx; 'drop' for other 4xx because resending cannot succeed.
 */
export async function sendBatch(fetchFn: typeof fetch, url: string, publicKey: string, events: AnalyticsEvent[]): Promise<SendResult> {
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ publicKey, events }),
      credentials: 'omit',
    });
    if (res.ok) return 'ok';
    if (res.status === 429 || res.status >= 500) return 'retry';
    return 'drop';
  } catch {
    return 'retry';
  }
}

export function sendWithBeacon(url: string, publicKey: string, events: AnalyticsEvent[]): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return false;
    const blob = new Blob([JSON.stringify({ publicKey, events })], { type: 'text/plain;charset=UTF-8' });
    return navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
}

/** 1s, 2s, 4s, ... capped at 30s, plus up to 20% jitter so many clients don't retry in sync. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(30_000, 1000 * 2 ** (attempt - 1));
  return Math.round(base * (1 + random() * 0.2));
}
