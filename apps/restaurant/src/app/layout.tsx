import type { ReactNode } from 'react';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';
import { AnalyticsInit } from '../components/AnalyticsInit';
import { EventPanel } from '../components/EventPanel';
import { Header } from '../components/Header';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata = { title: 'Trattoria — fresh pasta & wood-fired pizza' };

export default function RootLayout({ children }: { children: ReactNode }) {
  const dashboard = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? 'http://localhost:3000';
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <AnalyticsInit />
        <Header />
        {children}
        <footer className="site-footer">
          <div className="wrap">
            <span>Trattoria is a demo shop for the analytics SDK. No real orders are made.</span>
            <a href={`${dashboard}/dashboard`} target="_blank" rel="noreferrer">Open the analytics dashboard</a>
          </div>
        </footer>
        <EventPanel dashboardUrl={`${dashboard}/dashboard`} />
      </body>
    </html>
  );
}
