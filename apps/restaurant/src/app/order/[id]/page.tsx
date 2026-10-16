import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrder } from '../../../lib/orders';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();
  return (
    <main>
      <h1>Thank you{order.customer ? `, ${order.customer}` : ''}!</h1>
      <p className="note">Order <strong>{order.id}</strong> is confirmed.</p>
      {order.lines.map((l) => (
        <div className="item" key={l.itemId}>
          <span>{l.quantity} × {l.name}</span>
          <span className="price">${(l.price * l.quantity).toFixed(2)}</span>
        </div>
      ))}
      <div className="total">Total: ${order.total.toFixed(2)}</div>
      <p><Link href="/menu">Order something else</Link></p>
    </main>
  );
}
