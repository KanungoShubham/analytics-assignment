'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAnonymousId, track } from '@acme/browser-sdk';
import { findMenuItem, formatPrice } from '../../lib/menu';
import { useCart } from '../../lib/cart';
import { useUser } from '../../lib/user';

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const { user } = useUser();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tracked = useRef(false);

  const rows = lines.map((l) => ({ ...l, item: findMenuItem(l.itemId) })).filter((r) => r.item);
  const total = rows.reduce((sum, r) => sum + r.item!.price * r.quantity, 0);

  useEffect(() => {
    if (user && !name) setName(user.name);
  }, [user, name]);

  useEffect(() => {
    if (lines.length > 0 && !tracked.current) {
      tracked.current = true;
      track('checkout_started', { itemCount: lines.reduce((n, l) => n + l.quantity, 0), total });
    }
  }, [lines, total]);

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // anonymousId links this server-side order to the visitor's browser journey.
        body: JSON.stringify({ items: lines, customer: name, anonymousId: getAnonymousId(), userId: user?.id ?? null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'The order could not be placed. Try again.');
      clear();
      router.push(`/order/${body.orderId}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (rows.length === 0) {
    return (
      <main className="page">
        <div className="wrap empty">
          <h1>Nothing to check out yet</h1>
          <p>Your cart is empty. Pick a few dishes first.</p>
          <Link className="btn btn-primary" href="/menu">Browse the menu</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <h1>Checkout</h1>
          <p>Pay when you pick up. We only need a name for the order.</p>
        </div>
        <div className="two-col">
          <form onSubmit={placeOrder} style={{ maxWidth: 460 }}>
            <div className="field">
              <label htmlFor="order-name">Name for the order</label>
              <input id="order-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
              <span className="hint">We call this name when your food is ready.</span>
            </div>
            {error && <div className="error-box" role="alert">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Placing order…' : `Place order · ${formatPrice(total)}`}
            </button>
          </form>

          <aside className="summary">
            <h2>Your order</h2>
            {rows.map((r) => (
              <div className="summary-row" key={r.itemId}>
                <span>{r.quantity} × {r.item!.name}</span>
                <span>{formatPrice(r.item!.price * r.quantity)}</span>
              </div>
            ))}
            <div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
