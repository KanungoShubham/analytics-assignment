import { randomUUID } from 'node:crypto';
import type { ServerAnalytics } from '@acme/server-sdk';
import { OrderError, priceOrder, saveOrder, type Order } from './orders';

type Analytics = Pick<ServerAnalytics, 'track'>;
type Defer = (task: () => Promise<unknown>) => void;

const optionalString = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 200 ? v : null);

/**
 * Creates the order, then schedules the analytics event with `defer` (Next.js `after()`),
 * so a slow or down analytics server never delays or fails the customer's order.
 */
export function createOrder(body: unknown, analytics: Analytics, defer: Defer): { status: number; body: unknown } {
  const input = (body ?? {}) as { items?: unknown; customer?: unknown; anonymousId?: unknown; userId?: unknown };
  if (!Array.isArray(input.items)) return { status: 400, body: { error: 'items must be an array' } };

  let priced;
  try {
    priced = priceOrder(input.items);
  } catch (err) {
    if (err instanceof OrderError) return { status: 400, body: { error: err.message } };
    throw err;
  }

  const order: Order = {
    id: `ord_${randomUUID().slice(0, 8)}`,
    lines: priced.lines,
    total: priced.total,
    customer: optionalString(input.customer),
    createdAt: new Date().toISOString(),
  };
  saveOrder(order);

  const ids = { anonymousId: optionalString(input.anonymousId), userId: optionalString(input.userId) };
  defer(() =>
    analytics.track(
      'order_created',
      { orderId: order.id, total: order.total, itemCount: order.lines.reduce((n, l) => n + l.quantity, 0), items: order.lines.map((l) => l.itemId) },
      ids,
    ),
  );

  return { status: 201, body: { orderId: order.id, total: order.total } };
}
