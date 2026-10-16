function list(value: string | undefined, fallback: string[]): string[] {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : fallback;
}

export const config = {
  dbPath: process.env.ANALYTICS_DB_PATH ?? 'data/analytics.db',
  demoProject: {
    id: process.env.DEMO_PROJECT_ID ?? 'demo',
    name: 'Demo Restaurant',
    publicKey: process.env.DEMO_PUBLIC_KEY ?? 'pk_demo_123',
    secretKey: process.env.DEMO_SECRET_KEY ?? 'sk_demo_456',
    allowedOrigins: list(process.env.DEMO_ALLOWED_ORIGINS, ['http://localhost:3001']),
  },
  dashboardPassword: process.env.DASHBOARD_PASSWORD ?? 'admin',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-session-secret-change-me',
};
