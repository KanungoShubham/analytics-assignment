import { fetchFavourites } from '../../../lib/favourites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The browser sends its ids; this server adds the secret key, so it never reaches the browser. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { anonymousId?: unknown; userId?: unknown };
  const id = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 200 ? v : null);
  const favourites = await fetchFavourites(
    { anonymousId: id(body.anonymousId), userId: id(body.userId) },
    {
      endpoint: process.env.ANALYTICS_ENDPOINT ?? 'http://localhost:3000',
      secretKey: process.env.ANALYTICS_SECRET_KEY ?? 'sk_demo_456',
    },
  );
  return Response.json(favourites);
}
