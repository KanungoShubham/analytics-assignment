'use client';
import Link from 'next/link';
import { track } from '@acme/browser-sdk';
import { findMenuItem, formatPrice } from '../../lib/menu';
import { useCart } from '../../lib/cart';

export default function CartPage() {
  const { lines, add, decrement, remove } = useCart();
  const rows = lines.map((l) => ({ ...l, item: findMenuItem(l.itemId)! })).filter((r) => r.item);
  const total = rows.reduce((sum, r) => sum + r.item.price * r.quantity, 0);
  const count = rows.reduce((n, r) => n + r.quantity, 0);

  if (rows.length === 0) {
    return (
      <main className="page">
        <div className="wrap empty">
          <h1>Your cart is empty</h1>
          <p>Add a few dishes from the menu and they will show up here.</p>
          <Link className="btn btn-primary" href="/menu">Browse the menu</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <h1>Your cart</h1>
          <p>{count} {count === 1 ? 'dish' : 'dishes'} ready to order.</p>
        </div>
        <div className="two-col">
          <div>
            {rows.map((r) => (
              <div className="line-item" key={r.itemId}>
                <div>
                  <h3>{r.item.name}</h3>
                  <span className="unit">{formatPrice(r.item.price)} each · </span>
                  <button
                    className="link-btn"
                    onClick={() => {
                      remove(r.itemId);
                      track('remove_from_cart', { itemId: r.itemId });
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className="qty" aria-label={`Quantity of ${r.item.name}`}>
                  <button
                    aria-label="One less"
                    onClick={() => {
                      decrement(r.itemId);
                      track('remove_from_cart', { itemId: r.itemId, quantity: 1 });
                    }}
                  >
                    −
                  </button>
                  <span>{r.quantity}</span>
                  <button
                    aria-label="One more"
                    onClick={() => {
                      add(r.itemId);
                      track('add_to_cart', { itemId: r.itemId, name: r.item.name, price: r.item.price });
                    }}
                  >
                    +
                  </button>
                </div>
                <div className="line-total">{formatPrice(r.item.price * r.quantity)}</div>
              </div>
            ))}
            <p style={{ marginTop: 20 }}><Link href="/menu" className="link-btn">Add more dishes</Link></p>
          </div>

          <aside className="summary">
            <h2>Order summary</h2>
            <div className="summary-row"><span>Dishes</span><span>{count}</span></div>
            <div className="summary-row"><span>Pick up</span><span>Free</span></div>
            <div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
            <Link className="btn btn-primary" href="/checkout">Go to checkout</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
