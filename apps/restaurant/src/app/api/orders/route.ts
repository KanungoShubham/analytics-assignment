import { after } from 'next/server';
import { serverAnalytics } from '../../../lib/analytics-server';
import { createOrder } from '../../../lib/create-order';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }
  const result = createOrder(body, serverAnalytics, (task) => after(task));
  return Response.json(result.body, { status: result.status });
}
