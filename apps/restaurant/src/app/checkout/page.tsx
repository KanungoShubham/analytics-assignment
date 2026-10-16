'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getAnonymousId, track } from '@acme/browser-sdk';
import { findMenuItem } from '../../lib/menu';
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

  const total = lines.reduce((sum, l) => sum + (findMenuItem(l.itemId)?.price ?? 0) * l.quantity, 0);

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
      if (!res.ok) throw new Error(body.error ?? 'Could not place order');
      clear();
      router.push(`/order/${body.orderId}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <main>
        <h1>Checkout</h1>
        <p className="note">Your cart is empty.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Checkout</h1>
      <form onSubmit={placeOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
        <label>
          Name for the order
          <br />
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="total" style={{ textAlign: 'left' }}>Total: ${total.toFixed(2)}</div>
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Placing order…' : 'Place order'}</button>
      </form>
    </main>
  );
}
