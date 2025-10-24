/**
 * Home page
 * Hero, stats tiles, CTA
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <div className="relative">
      {/* Hero Section with animated background */}
      <div className="relative overflow-hidden">
        {/* Animated grid overlay */}
        <div className="absolute inset-0 cyber-grid-overlay pointer-events-none opacity-30" />

        <div className="container-arena py-20 md:py-32 text-center relative z-10">
          {/* Main Title with animation */}
          <div className="mb-6 animate-slide-up">
            <h1 className="hero-title">
              ECHO ARENA
            </h1>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-echo-magenta to-transparent" />
          </div>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-echo-muted mb-3 font-orbitron tracking-wide uppercase animate-slide-up opacity-80">
            Echoes of Code. Clones of Thought.
          </p>

          {/* Subtitle */}
          <p className="hero-subtitle mb-12 max-w-3xl mx-auto animate-slide-up">
            Build a trading bot in 500 chars • Battle 24h on real BSC data • Win BNB
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up">
            <Link
              href={isConnected ? '/spawn' : '#'}
              className="btn-primary text-lg px-10 py-4 relative overflow-hidden group"
              onClick={(e) => {
                if (!isConnected) {
                  e.preventDefault();
                  alert('Please connect your wallet first');
                }
              }}
            >
              <span className="relative z-10">
                {isConnected ? 'SPAWN BOT' : 'CONNECT TO START'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-echo-cyan to-echo-magenta opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link href="/arena" className="btn-secondary text-lg px-10 py-4">
              VIEW ARENA →
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid with unified glow */}
      <div className="container-arena -mt-8 mb-20 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBanner
            label="BOTS ENTERED"
            value={match?.match?.botsEntered || 0}
            iconPath="/icons/BotsEntered.png"
            color="magenta"
          />
          <StatBanner
            label="TOTAL BURNS"
            value={`${(match?.match?.totalBurnsBNB || 0).toFixed(4)} BNB`}
            iconPath="/icons/Burns.png"
            color="cyan"
          />
          <StatBanner
            label="PRIZE CAP"
            value={`${config?.prizes?.capBNB || 5} BNB`}
            iconPath="/icons/PrizeCap.png"
            color="gold"
          />
          <StatBanner
            label="TIME TO RESET"
            value={timeRemaining}
            iconPath="/icons/TimeToReset.png"
            color="magenta"
          />
        </div>
      </div>

      {/* How it Works Section */}
      <div className="container-arena mb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-orbitron font-bold mb-4 tracking-wider uppercase">
            <span className="neon-text">HOW IT WORKS</span>
          </h2>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-echo-cyan to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            number={1}
            title="WRITE STRATEGY"
            description="Describe your trading strategy in ≤500 characters. Use simple commands like 'buy momentum tokens with TP 20% and SL 15%'"
          />
          <StepCard
            number={2}
            title="BURN $ECHO"
            description="During Week 1, spawn 1 free bot. After that, burn 0.01 BNB worth of $ECHO tokens to enter each daily battle."
          />
          <StepCard
            number={3}
            title="WIN BNB"
            description="Your bot trades on real BSC prices for 24h. Winner receives 1 BNB × min(% gain, 500%), capped at 5 BNB."
          />
        </div>
      </div>

      {/* Features Grid */}
      <div className="container-arena mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            title="REAL MARKET DATA"
            description="Simulations use live BSC price feeds from Dexscreener with real fees, slippage, and latency."
            iconPath="/icons/MarketData.png"
          />
          <FeatureCard
            title="FAIR & DETERMINISTIC"
            description="All bots execute in deterministic order. No arbitrary randomness. Pure skill."
            iconPath="/icons/FairDetermin.png"
          />
          <FeatureCard
            title="60 ORDERS MAX"
            description="Each bot can execute up to 60 orders per day with a 5-second cooldown."
            iconPath="/icons/60orders.png"
          />
          <FeatureCard
            title="TRANSPARENT RESULTS"
            description="Every match result is hashed (SHA-256) and stored on-chain for verification."
            iconPath="/icons/transparent.png"
          />
        </div>
      </div>
    </div>
  );
}

function StatBanner({
  label,
  value,
  iconPath,
  color,
}: {
  label: string;
  value: string | number;
  iconPath: string;
  color: 'magenta' | 'cyan' | 'gold';
}) {
  const colorClasses = {
    magenta: 'border-echo-magenta/30 hover:border-echo-magenta/60 shadow-neon-magenta/20',
    cyan: 'border-echo-cyan/30 hover:border-echo-cyan/60 shadow-neon-cyan/20',
    gold: 'border-echo-gold/30 hover:border-echo-gold/60 shadow-neon-gold/20',
  };

  const textColors = {
    magenta: 'text-echo-magenta',
    cyan: 'text-echo-cyan',
    gold: 'text-echo-gold',
  };

  return (
    <div className={`stat-banner group ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 relative flex-shrink-0">
          <Image
            src={iconPath}
            alt={label}
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
        <div className="flex-1">
          <div className="text-xs font-orbitron tracking-wider text-echo-muted uppercase mb-1">
            {label}
          </div>
          <div className={`text-2xl md:text-3xl font-orbitron font-bold ${textColors[color]} group-hover:scale-105 transition-transform`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="card-arena text-center relative overflow-hidden group">
      {/* Number orb with glow */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-echo-magenta to-echo-cyan flex items-center justify-center text-3xl font-orbitron font-black mx-auto shadow-neon-magenta-lg group-hover:scale-110 transition-transform">
          {number}
        </div>
        {/* Decorative glow ring */}
        <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-echo-magenta/20 mx-auto animate-ping opacity-75" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-orbitron font-bold mb-3 tracking-wider text-echo-cyan">
        {title}
      </h3>

      {/* Description */}
      <p className="text-echo-muted text-sm leading-relaxed">
        {description}
      </p>

      {/* Top glow border */}
      <div className="glow-border-top absolute top-0 left-0 right-0" />
    </div>
  );
}

function FeatureCard({
  title,
  description,
  iconPath,
}: {
  title: string;
  description: string;
  iconPath: string;
}) {
  return (
    <div className="card-arena group">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 relative flex-shrink-0 group-hover:scale-110 transition-transform">
          <Image
            src={iconPath}
            alt={title}
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-orbitron font-bold mb-2 tracking-wide text-echo-cyan group-hover:text-echo-magenta transition-colors">
            {title}
          </h3>
          <p className="text-echo-muted text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
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
