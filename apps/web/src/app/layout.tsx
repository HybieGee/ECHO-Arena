/**
 * Root layout
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { WalletButton } from '@/components/wallet-button';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ECHO Arena - AI Trading Game',
  description: 'Build a bot in 500 chars. Trade 24h on real data. Win BNB.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b border-arena-border bg-arena-surface">
              <div className="container-arena py-4">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="text-2xl font-bold neon-text">
                      ECHO ARENA
                    </div>
                  </Link>

                  <nav className="flex items-center gap-6">
                    <Link
                      href="/spawn"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Spawn Bot
                    </Link>
                    <Link
                      href="/arena"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Arena
                    </Link>
                    <Link
                      href="/winners"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Winners
                    </Link>
                    <WalletButton />
                  </nav>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="border-t border-arena-border bg-arena-surface mt-12">
              <div className="container-arena py-6">
                <div className="text-center text-gray-400 text-sm">
                  ECHO Arena - Powered by Cloudflare & BSC
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
