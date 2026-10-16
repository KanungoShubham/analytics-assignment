import { findMenuItem } from './menu';

export interface Favourites {
  visits: number;
  items: string[]; // menu item ids, best first
}

interface Options {
  endpoint: string;
  secretKey: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

const NONE: Favourites = { visits: 0, items: [] };

/**
 * Asks the analytics profile API which dishes this visitor likes. Personalisation is optional:
 * any failure or a slow response returns no favourites, so the menu always works.
 */
export async function fetchFavourites(ids: { anonymousId?: string | null; userId?: string | null }, opts: Options): Promise<Favourites> {
  if (!ids.anonymousId && !ids.userId) return NONE;
  const params = new URLSearchParams();
  if (ids.anonymousId) params.set('anonymousId', ids.anonymousId);
  if (ids.userId) params.set('userId', ids.userId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 1500);
  try {
    const res = await (opts.fetch ?? fetch)(`${opts.endpoint.replace(/\/+$/, '')}/api/profile?${params}`, {
      headers: { Authorization: `Bearer ${opts.secretKey}` },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return NONE;
    const body = (await res.json()) as { visits?: number; favourites?: { itemId: string }[] };
    return {
      visits: body.visits ?? 0,
      items: (body.favourites ?? []).map((f) => f.itemId).filter((id) => findMenuItem(id)),
    };
  } catch {
    return NONE;
  } finally {
    clearTimeout(timer);
  }
}
