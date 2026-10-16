import type { ReactNode } from 'react';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';
import { AnalyticsInit } from '../components/AnalyticsInit';
import { Header } from '../components/Header';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata = { title: 'Trattoria — fresh pasta & wood-fired pizza' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <AnalyticsInit />
        <Header />
        {children}
        <footer className="site-footer">
          <div className="wrap">
            <span>Trattoria · fresh pasta & wood-fired pizza</span>
            <span>Demo shop: no real orders are made.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
