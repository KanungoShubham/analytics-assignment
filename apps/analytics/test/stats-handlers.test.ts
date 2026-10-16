import { describe, it, expect } from 'vitest';
import { createTestDb } from './helpers';
import { handleStats } from '../src/lib/stats-handlers';
import { createSessionToken } from '../src/lib/auth';

const SECRET = 'test-secret';
const req = (q: string, cookie?: string) =>
  new Request(`http://localhost:3000/api/stats/overview?${q}`, { headers: cookie ? { cookie } : {} });

describe('handleStats', () => {
  it('401 without a dashboard session', () => {
    expect(handleStats(req(''), createTestDb(), 'demo', 'overview', SECRET).status).toBe(401);
  });
  it('200 with a session', async () => {
    const res = handleStats(req('from=2026-10-01&to=2026-10-02', `dash_session=${createSessionToken(SECRET)}`), createTestDb(), 'demo', 'overview', SECRET);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ pageViews: 0 });
  });
  it('400 for an invalid range', () => {
    const res = handleStats(req('from=bad', `dash_session=${createSessionToken(SECRET)}`), createTestDb(), 'demo', 'timeseries', SECRET);
    expect(res.status).toBe(400);
  });
});
