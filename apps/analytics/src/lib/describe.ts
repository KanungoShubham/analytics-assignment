import type { RecentEvent } from './stats';

/** Plain-language labels for events, shared by the activity feed and visitor journeys. */

type Who = Pick<RecentEvent, 'userId' | 'anonymousId'>;

export function who(e: Who): string {
  if (e.userId) {
    const name = e.userId.replace(/^user_/, '').replace(/_/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return e.anonymousId ? `Visitor ${e.anonymousId.slice(-4)}` : 'Unknown visitor';
}

export function what(e: RecentEvent): string {
  const p = e.properties;
  switch (e.name) {
    case 'page_view':
      return `viewed ${e.url ?? 'a page'}`;
    case 'identify':
      return 'logged in';
    case 'add_to_cart':
      return `added ${String(p.name ?? p.itemId ?? 'a dish')} to the cart${p.from === 'favourites' ? ' from their favourites' : ''}`;
    case 'remove_from_cart':
      return `removed ${String(p.itemId ?? 'a dish')} from the cart`;
    case 'menu_section_clicked':
      return `opened the ${String(p.section ?? '')} section`.replace('  ', ' ');
    case 'checkout_started':
      return 'started checkout';
    case 'order_created':
      return `placed an order${typeof p.total === 'number' ? ` for $${p.total.toFixed(2)}` : ''}`;
    default:
      return e.name.replace(/_/g, ' ');
  }
}

export function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export const dotClass = (e: RecentEvent) => (e.name === 'order_created' ? 'order' : e.type);
