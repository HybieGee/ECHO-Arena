/**
 * Root layout - ECHO Arena Cyberpunk Theme
 */

import type { Metadata } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { WalletButton } from '@/components/wallet-button';
import Link from 'next/link';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '500', '600', '700', '800', '900'],
});

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
      <body className={`${inter.variable} ${orbitron.variable} font-inter`}>
        <Providers>
          <div className="min-h-screen flex flex-col bg-cyber-grid">
            {/* Animated gradient overlay */}
            <div className="fixed inset-0 bg-hero-gradient pointer-events-none opacity-60" />

            {/* Content container */}
            <div className="relative z-10 min-h-screen flex flex-col">
              {/* Header */}
              <header className="border-b border-echo-magenta/20 bg-arena-surface/90 backdrop-blur-md">
                <div className="container-arena py-4">
                  <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                      <div className="text-2xl font-orbitron font-bold tracking-wider uppercase">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-echo-magenta via-echo-cyan to-echo-magenta bg-[length:200%_100%] animate-gradient-shift">
                          ECHO ARENA
                        </span>
                      </div>
                    </Link>

                    <nav className="flex items-center gap-6">
                      <Link
                        href="/spawn"
                        className="text-echo-muted hover:text-echo-cyan transition-all font-medium tracking-wide"
                      >
                        SPAWN BOT
                      </Link>
                      <Link
                        href="/arena"
                        className="text-echo-muted hover:text-echo-cyan transition-all font-medium tracking-wide"
                      >
                        ARENA
                      </Link>
                      <Link
                        href="/winners"
                        className="text-echo-muted hover:text-echo-gold transition-all font-medium tracking-wide"
                      >
                        WINNERS
                      </Link>
                      <WalletButton />
                    </nav>
                  </div>
                </div>
              </header>

              {/* Main content */}
              <main className="flex-1">{children}</main>

              {/* Footer */}
              <footer className="border-t border-echo-magenta/20 bg-arena-surface/90 backdrop-blur-md mt-12">
                <div className="container-arena py-6">
                  <div className="text-center text-echo-muted text-sm">
                    <span className="font-orbitron tracking-wider">ECHO ARENA</span> — Powered by Cloudflare & BSC
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
