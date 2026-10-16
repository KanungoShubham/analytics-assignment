'use client';
import Link from 'next/link';
import { track } from '@acme/browser-sdk';
import { findMenuItem } from '../../lib/menu';
import { useCart } from '../../lib/cart';

export default function CartPage() {
  const { lines, remove } = useCart();
  const rows = lines.map((l) => ({ ...l, item: findMenuItem(l.itemId) })).filter((r) => r.item);
  const total = rows.reduce((sum, r) => sum + r.item!.price * r.quantity, 0);

  if (rows.length === 0) {
    return (
      <main>
        <h1>Your cart</h1>
        <p className="note">Your cart is empty. <Link href="/menu">Browse the menu</Link>.</p>
      </main>
    );
  }
  return (
    <main>
      <h1>Your cart</h1>
      {rows.map((r) => (
        <div className="item" key={r.itemId}>
          <span>{r.quantity} × {r.item!.name}</span>
          <span style={{ display: 'flex', gap: 12 }}>
            <span className="price">${(r.item!.price * r.quantity).toFixed(2)}</span>
            <button
              className="link"
              onClick={() => {
                remove(r.itemId);
                track('remove_from_cart', { itemId: r.itemId });
              }}
            >
              Remove
            </button>
          </span>
        </div>
      ))}
      <div className="total">Total: ${total.toFixed(2)}</div>
      <p style={{ textAlign: 'right' }}><Link className="btn" href="/checkout">Checkout</Link></p>
    </main>
  );
}
