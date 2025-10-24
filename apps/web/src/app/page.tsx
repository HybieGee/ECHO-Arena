/**
 * Home page
 * Hero, stats tiles, CTA
 */

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();

  const { data: match } = useQuery({
    queryKey: ['current-match'],
    queryFn: api.getCurrentMatch,
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
  });

  const timeRemaining = match?.match?.timeRemaining
    ? formatTimeRemaining(match.match.timeRemaining)
    : '...';

  return (
    <div className="container-arena py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold mb-6 neon-text animate-glow">
          ECHO ARENA
        </h1>
        <p className="text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Build a bot in 500 chars. Trade 24h on real BSC data. Win BNB.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href={isConnected ? '/spawn' : '#'}
            className="btn-primary text-lg px-8 py-4"
            onClick={(e) => {
              if (!isConnected) {
                e.preventDefault();
                alert('Please connect your wallet first');
              }
            }}
          >
            {isConnected ? 'Spawn Bot' : 'Connect Wallet to Start'}
          </Link>
          <Link href="/arena" className="btn-secondary text-lg px-8 py-4">
            View Arena
          </Link>
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <StatTile
          label="Bots Entered"
          value={match?.match?.botsEntered || 0}
          color="purple"
        />
        <StatTile
          label="Total Burns"
          value={`${(match?.match?.totalBurnsBNB || 0).toFixed(4)} BNB`}
          color="cyan"
        />
        <StatTile
          label="Prize Cap"
          value={`${config?.prizes?.capBNB || 5} BNB`}
          color="pink"
        />
        <StatTile
          label="Time to Reset"
          value={timeRemaining}
          color="blue"
        />
      </div>

      {/* How it Works */}
      <div className="card-arena mb-16">
        <h2 className="text-3xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Step
            number="1"
            title="Write Strategy"
            description="Describe your trading strategy in ≤500 characters. Use simple commands like 'buy momentum tokens with TP 20% and SL 15%'"
          />
          <Step
            number="2"
            title="Burn $ECHO"
            description="During Week 1, spawn 1 free bot. After that, burn 0.01 BNB worth of $ECHO tokens to enter each daily battle."
          />
          <Step
            number="3"
            title="Win BNB"
            description="Your bot trades on real BSC prices for 24h. Winner receives 1 BNB × min(% gain, 500%), capped at 5 BNB."
          />
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          title="Real Market Data"
          description="Simulations use live BSC price feeds from Dexscreener with real fees, slippage, and latency."
        />
        <FeatureCard
          title="Fair & Deterministic"
          description="All bots execute in deterministic order. No arbitrary randomness. Pure skill."
        />
        <FeatureCard
          title="60 Orders Max"
          description="Each bot can execute up to 60 orders per day with a 5-second cooldown."
        />
        <FeatureCard
          title="Transparent Results"
          description="Every match result is hashed (SHA-256) and stored on-chain for verification."
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'purple' | 'cyan' | 'pink' | 'blue';
}) {
  const colorClasses = {
    purple: 'border-neon-purple text-neon-purple',
    cyan: 'border-neon-cyan text-neon-cyan',
    pink: 'border-neon-pink text-neon-pink',
    blue: 'border-neon-blue text-neon-blue',
  };

  return (
    <div className={`card-arena border-2 ${colorClasses[color]}`}>
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="card-arena">
      <h3 className="text-xl font-bold mb-2 text-neon-cyan">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
