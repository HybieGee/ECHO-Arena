/**
 * Winners page
 * Historical winners with results
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Image from 'next/image';

export default function WinnersPage() {
  const { data: matchHistory, isLoading } = useQuery({
    queryKey: ['match-history'],
    queryFn: api.getMatchHistory,
  });

  const settledMatches = matchHistory?.matches?.filter(
    (m: any) => m.status === 'settled'
  ) || [];

  if (isLoading) {
    return (
      <div className="container-arena py-12">
        <h1 className="text-4xl font-orbitron font-bold mb-8 text-echo-cyan text-center uppercase tracking-wider">
          HALL OF CHAMPIONS
        </h1>
        <div className="card-arena text-center py-12">
          <div className="text-echo-muted">Loading match results...</div>
        </div>
      </div>
    );
  }

  if (!settledMatches.length) {
    return (
      <div className="container-arena py-12">
        <h1 className="text-4xl font-orbitron font-bold mb-8 text-echo-cyan text-center uppercase tracking-wider">
          HALL OF CHAMPIONS
        </h1>

        <div className="card-arena">
          <div className="text-center text-echo-muted py-12">
            <div className="flex justify-center mb-4">
              <Image
                src="/icons/Winners.png"
                alt="No Winners Yet"
                width={150}
                height={150}
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-orbitron font-bold mb-2 text-echo-cyan">No Winners Yet</h2>
            <p>
              Historical match results and winner leaderboard will be displayed here.
            </p>
            <p className="mt-4 text-sm">
              Complete a match to see winners!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-arena py-12">
      <h1 className="text-4xl font-orbitron font-bold mb-8 text-echo-cyan text-center uppercase tracking-wider">
        HALL OF CHAMPIONS
      </h1>

      <div className="space-y-6">
        {settledMatches.map((match: any) => (
          <MatchResultCard key={match.id} matchId={match.id} />
        ))}
      </div>
    </div>
  );
}

function MatchResultCard({ matchId }: { matchId: number }) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['match-results', matchId],
    queryFn: () => api.getMatchResults(matchId.toString()),
  });

  if (isLoading) {
    return (
      <div className="card-arena">
        <div className="text-center text-echo-muted py-8">
          Loading Match #{matchId} results...
        </div>
      </div>
    );
  }

  if (!results?.winners || results.winners.length === 0) {
    return (
      <div className="card-arena">
        <div className="text-sm text-echo-muted mb-2">Match #{matchId}</div>
        <div className="text-center text-echo-muted py-4">
          No winners data available
        </div>
      </div>
    );
  }

  const topWinners = results.winners.slice(0, 5);
  const firstPlace = topWinners[0];

  // Format date from timestamp
  const matchDate = results.match?.end_ts
    ? new Date(results.match.end_ts * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  // Truncate address for display
  const truncateAddress = (addr: string) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="card-arena border-echo-cyan/30">
      {/* Match Header */}
      <div className="border-b border-echo-magenta/20 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-echo-muted mb-1">MATCH #{matchId}</div>
            <div className="text-2xl font-orbitron font-bold text-echo-cyan mb-1">
              {matchDate}
            </div>
            <div className="text-xs text-echo-muted font-mono">
              {results.match?.result_hash?.slice(0, 16)}...
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-echo-muted uppercase mb-1">Total Bots</div>
            <div className="text-2xl font-bold text-echo-cyan">
              {results.winners.length}
            </div>
          </div>
        </div>
      </div>

      {/* First Place Winner */}
      <div className="bg-gradient-to-r from-echo-gold/10 to-transparent border border-echo-gold/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-3xl">🏆</div>
          <div className="flex-1">
            <div className="text-xs text-echo-muted uppercase tracking-wide mb-1">
              1st Place Champion
            </div>
            <div className="font-orbitron font-bold text-lg text-echo-gold">
              {firstPlace.bot_name || `Bot #${firstPlace.bot_id}`}
            </div>
            <div className="text-xs text-echo-muted font-mono mt-1">
              Owner: {truncateAddress(firstPlace.owner_address)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-echo-muted mb-1">Final Balance</div>
            <div className="text-xl font-bold text-white">
              {firstPlace.end_balance.toFixed(4)} BNB
            </div>
            <div className={`text-2xl font-bold mt-1 ${firstPlace.gain_pct >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
              {firstPlace.gain_pct >= 0 ? '+' : ''}{firstPlace.gain_pct.toFixed(2)}%
            </div>
            <div className="text-xs text-echo-muted mt-2 mb-1">
              Prize (1 BNB × {firstPlace.gain_pct >= 0 ? 'gain%' : '0'})
            </div>
            <div className="text-lg font-bold text-echo-gold">
              {firstPlace.prize_bnb.toFixed(4)} BNB
            </div>
          </div>
        </div>
      </div>

      {/* Other Top Performers */}
      {topWinners.length > 1 && (
        <div className="space-y-2">
          <div className="text-xs text-echo-muted uppercase tracking-wide mb-2">
            Top 5 Performers
          </div>
          {topWinners.slice(1).map((winner: any, idx: number) => (
            <div
              key={winner.bot_id}
              className="flex items-center justify-between p-3 bg-arena-bg rounded-lg border border-echo-magenta/10"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-echo-muted font-mono text-sm w-8">
                  #{idx + 2}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-echo-text">
                    {winner.bot_name || `Bot #${winner.bot_id}`}
                  </div>
                  <div className="text-xs text-echo-muted font-mono">
                    {truncateAddress(winner.owner_address)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-echo-muted mb-1">Final Balance</div>
                <div className="text-lg font-bold text-white">
                  {winner.end_balance.toFixed(4)} BNB
                </div>
                <div className={`font-bold mt-1 ${winner.gain_pct >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {winner.gain_pct >= 0 ? '+' : ''}{winner.gain_pct.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total Participants */}
      <div className="mt-4 pt-4 border-t border-echo-magenta/20 text-center text-sm text-echo-muted">
        {results.winners.length} bots competed • {topWinners.length} shown
      </div>
    </div>
  );
}
