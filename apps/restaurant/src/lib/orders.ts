import { findMenuItem } from './menu';

export interface OrderLine {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  lines: OrderLine[];
  total: number;
  customer: string | null;
  createdAt: string;
}

export class OrderError extends Error {}

/** Demo storage: in memory, cleared on restart. Kept on globalThis to survive hot reloads. */
const store: Map<string, Order> = ((globalThis as { __orders?: Map<string, Order> }).__orders ??= new Map());

/** Prices come from the menu, never from the client. */
export function priceOrder(items: { itemId: unknown; quantity: unknown }[]): { lines: OrderLine[]; total: number } {
  if (items.length === 0) throw new OrderError('Cart is empty');
  const lines = items.map(({ itemId, quantity }) => {
    const item = typeof itemId === 'string' ? findMenuItem(itemId) : undefined;
    if (!item) throw new OrderError(`Unknown menu item: ${String(itemId)}`);
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 20) {
      throw new OrderError(`Invalid quantity for ${item.name}`);
    }
    return { itemId: item.id, name: item.name, price: item.price, quantity: quantity as number };
  });
  const total = Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100;
  return { lines, total };
}

export const saveOrder = (order: Order) => void store.set(order.id, order);
export const getOrder = (id: string) => store.get(id);
