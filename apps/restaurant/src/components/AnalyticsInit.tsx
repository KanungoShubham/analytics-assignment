'use client';
import { useEffect } from 'react';
import { init } from '@acme/browser-sdk';

export function AnalyticsInit() {
  useEffect(() => {
    init({
      endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? 'http://localhost:3000',
      publicKey: process.env.NEXT_PUBLIC_ANALYTICS_PUBLIC_KEY ?? 'pk_demo_123',
      debug: process.env.NODE_ENV !== 'production',
    });
  }, []);
  return null;
}
