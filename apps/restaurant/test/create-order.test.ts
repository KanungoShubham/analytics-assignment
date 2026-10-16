import { describe, it, expect, vi } from 'vitest';
import { createOrder } from '../src/lib/create-order';
import { getOrder } from '../src/lib/orders';

function setup(trackResult = { ok: true }) {
  const analytics = { track: vi.fn(async (..._args: unknown[]) => trackResult) };
  const tasks: (() => Promise<unknown>)[] = [];
  const defer = (task: () => Promise<unknown>) => {
    tasks.push(task);
  };
  return { analytics, tasks, defer };
}

describe('createOrder', () => {
  it('prices the order from the menu (ignores client prices) and saves it', () => {
    const { analytics, defer } = setup();
    const res = createOrder({ items: [{ itemId: 'margherita', quantity: 2, price: 0.01 }], customer: 'Asha' }, analytics, defer);
    expect(res.status).toBe(201);
    const body = res.body as { orderId: string; total: number };
    expect(body.total).toBe(25);
    expect(getOrder(body.orderId)?.customer).toBe('Asha');
  });

  it('defers order_created tracking with the visitor ids', async () => {
    const { analytics, tasks, defer } = setup();
    const res = createOrder({ items: [{ itemId: 'tiramisu', quantity: 1 }], anonymousId: 'anon_1', userId: 'user_asha' }, analytics, defer);
    expect(analytics.track).not.toHaveBeenCalled(); // not on the response path
    await Promise.all(tasks.map((t) => t()));
    expect(analytics.track).toHaveBeenCalledWith(
      'order_created',
      expect.objectContaining({ orderId: (res.body as { orderId: string }).orderId, total: 7, itemCount: 1 }),
      { anonymousId: 'anon_1', userId: 'user_asha' },
    );
  });

  it('order succeeds when analytics fails', async () => {
    const { analytics, tasks, defer } = setup({ ok: false });
    const res = createOrder({ items: [{ itemId: 'tiramisu', quantity: 1 }] }, analytics, defer);
    expect(res.status).toBe(201);
    await expect(Promise.all(tasks.map((t) => t()))).resolves.toBeDefined();
  });

  it('rejects empty carts, unknown items and bad quantities', () => {
    const { analytics, defer } = setup();
    expect(createOrder({ items: [] }, analytics, defer).status).toBe(400);
    expect(createOrder({ items: [{ itemId: 'sushi', quantity: 1 }] }, analytics, defer).status).toBe(400);
    expect(createOrder({ items: [{ itemId: 'tiramisu', quantity: 0 }] }, analytics, defer).status).toBe(400);
    expect(createOrder({ items: [{ itemId: 'tiramisu', quantity: 1.5 }] }, analytics, defer).status).toBe(400);
    expect(createOrder(null, analytics, defer).status).toBe(400);
  });
});
