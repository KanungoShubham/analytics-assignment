import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@acme/shared'],
  serverExternalPackages: ['better-sqlite3'],
};
export default nextConfig;
