import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrder } from '../../../lib/orders';
import { formatPrice } from '../../../lib/menu';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();

  return (
    <main className="page">
      <div className="wrap confirm">
        <svg className="check" viewBox="0 0 84 84" aria-hidden>
          <circle cx="42" cy="42" r="42" />
          <path d="M26 43 l11 11 l21 -23" />
        </svg>
        <h1>Order placed{order.customer ? `, ${order.customer}` : ''}</h1>
        <p className="lead">Order <strong>{order.id}</strong> is with the kitchen. It will be ready in about 20 minutes.</p>

        <div className="receipt">
          {order.lines.map((l) => (
            <div className="receipt-row" key={l.itemId}>
              <span>{l.quantity} × {l.name}</span>
              <span>{formatPrice(l.price * l.quantity)}</span>
            </div>
          ))}
          <div className="receipt-row"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>

        <div className="confirm-actions">
          <Link className="btn btn-primary" href="/menu">Order something else</Link>
        </div>
      </div>
    </main>
  );
}
