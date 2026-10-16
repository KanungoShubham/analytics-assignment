import type { ReactNode } from 'react';
import './globals.css';
import { AnalyticsInit } from '../components/AnalyticsInit';
import { Header } from '../components/Header';

export const metadata = { title: 'Trattoria Demo' };

export default function RootLayout({ children }: { children: ReactNode }) {
  const dashboard = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? 'http://localhost:3000';
  return (
    <html lang="en">
      <body>
        <AnalyticsInit />
        <Header />
        {children}
        <footer>
          Demo app for the analytics SDK · <a href={`${dashboard}/dashboard`} target="_blank" rel="noreferrer">Open the dashboard</a>
        </footer>
      </body>
    </html>
  );
}
