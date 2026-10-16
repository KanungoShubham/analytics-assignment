export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Reads the body as text (works for application/json and text/plain from sendBeacon) and parses JSON. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new HttpError(413, 'Request body too large');
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(413, 'Request body too large');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Body must be valid JSON');
  }
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers });
}

export function errorResponse(err: unknown, headers: Record<string, string> = {}): Response {
  if (err instanceof HttpError) return jsonResponse({ error: err.message }, err.status, headers);
  console.error('[analytics] unexpected error', err);
  return jsonResponse({ error: 'Internal server error' }, 500, headers);
}

/** Used only for rate limiting, never stored. */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}
