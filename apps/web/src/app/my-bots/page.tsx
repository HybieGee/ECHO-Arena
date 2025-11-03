/**
 * My Bots page
 * Shows all bots created by the connected wallet
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { PillButton } from '@/components/pill-button';
import Image from 'next/image';

export default function MyBotsPage() {
  const { address, isConnected } = useAccount();

  const { data: botsData, isLoading } = useQuery({
    queryKey: ['my-bots', address],
    queryFn: () => api.getBotsByOwner(address!),
    enabled: !!address,
    refetchInterval: 10000, // Refresh every 10s
  });

  if (!isConnected) {
    return (
      <div className="container-arena py-12">
        <h1 className="text-4xl font-bold mb-8 text-echo-cyan text-center">
          MY BOTS
        </h1>
        <div className="card-arena text-center py-12">
          <div className="flex justify-center mb-4">
            <Image
              src="/icons/WalletNotConnected.png"
              alt="Wallet Not Connected"
              width={150}
              height={150}
              className="object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to view your bots.
          </p>
        </div>
      </div>
    );
  }

  const bots = botsData?.bots || [];

  return (
    <div className="container-arena py-12">
      <h1 className="text-4xl font-bold mb-8 text-echo-cyan text-center">
        MY BOTS
      </h1>

      {isLoading ? (
        <div className="text-center text-gray-400">Loading your bots...</div>
      ) : bots.length === 0 ? (
        <div className="card-arena text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold mb-2">No Bots Yet</h2>
          <p className="text-gray-400 mb-6">
            You haven't created any trading bots yet.
          </p>
          <div className="inline-block rounded-full bg-gradient-to-r from-echo-magenta to-echo-cyan p-[2px]">
            <Link
              href="/spawn"
              className="block rounded-full bg-arena-surface px-8 py-4 text-lg font-orbitron font-semibold tracking-wide uppercase text-echo-cyan transition-all duration-300 hover:bg-gradient-to-r hover:from-echo-magenta/10 hover:to-echo-cyan/10"
            >
              SPAWN YOUR FIRST BOT →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center text-gray-400">
            Total Bots: <span className="text-neon-cyan font-bold">{bots.length}</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot: any) => (
              <BotCard key={bot.id} bot={bot} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BotCard({ bot }: { bot: any }) {
  const statusColors = {
    pending: 'text-echo-gold',
    running: 'text-neon-green',
    settled: 'text-neon-cyan',
    completed: 'text-gray-400',
  };

  const statusText = {
    pending: 'Waiting to Start',
    running: 'Active',
    settled: 'Match Ended',
    completed: 'Completed',
  };

  const matchStatus = bot.matchStatus || 'unknown';
  const statusColor = statusColors[matchStatus as keyof typeof statusColors] || 'text-gray-400';
  const statusLabel = statusText[matchStatus as keyof typeof statusText] || 'Unknown';

  // Format timestamp
  const createdDate = new Date(bot.createdAt * 1000).toLocaleDateString();
  const createdTime = new Date(bot.createdAt * 1000).toLocaleTimeString();

  return (
    <div className="card-arena group hover:border-neon-cyan/50 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-sm text-gray-400 mb-1">Bot #{bot.id}</div>
          <h3 className="text-xl font-bold text-neon-cyan group-hover:text-neon-magenta transition-colors">
            {bot.name || 'Unnamed Bot'}
          </h3>
        </div>
        <div className={`text-sm font-bold ${statusColor}`}>
          {statusLabel}
        </div>
      </div>

      {bot.description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {bot.description}
        </p>
      )}

      <div className="border-t border-arena-border pt-4 mb-4">
        <div className="text-xs text-gray-500 mb-2">Strategy:</div>
        <p className="text-sm text-gray-300 line-clamp-3 font-mono">
          {bot.prompt}
        </p>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
        <div>
          Match #{bot.matchId}
        </div>
        <div>
          {createdDate} {createdTime}
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/arena`}
          className="flex-1 text-center rounded-full border-2 border-gray-500 hover:border-echo-cyan hover:bg-echo-cyan/5 font-orbitron font-semibold tracking-wide uppercase text-echo-text transition-all duration-300 px-4 py-2 text-sm"
        >
          VIEW ARENA
        </Link>
        {matchStatus === 'running' && (
          <div className="px-3 py-2 bg-neon-green/10 text-neon-green rounded text-sm font-bold border border-neon-green/30 animate-pulse">
            LIVE
          </div>
        )}
      </div>
    </div>
  );
}
