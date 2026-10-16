import { ServerAnalytics } from '@acme/server-sdk';

export const serverAnalytics = new ServerAnalytics({
  endpoint: process.env.ANALYTICS_ENDPOINT ?? 'http://localhost:3000',
  secretKey: process.env.ANALYTICS_SECRET_KEY ?? 'sk_demo_456',
});
