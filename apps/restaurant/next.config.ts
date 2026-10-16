import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@acme/browser-sdk', '@acme/server-sdk', '@acme/shared'],
};
export default nextConfig;
