/**
 * Winners page
 * Historical winners with results
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function WinnersPage() {
  // For MVP, just show placeholder
  // In production, you'd fetch historical matches and their winners

  return (
    <div className="container-arena py-12">
      <h1 className="text-4xl font-bold mb-8 neon-text text-center">
        HALL OF CHAMPIONS
      </h1>

      <div className="card-arena">
        <div className="text-center text-gray-400 py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold mb-2">No Winners Yet</h2>
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

function WinnerCard({
  matchId,
  date,
  winner,
  gain,
  prize,
  resultHash,
}: {
  matchId: number;
  date: string;
  winner: string;
  gain: string;
  prize: string;
  resultHash: string;
}) {
  return (
    <div className="card-arena">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-400 mb-1">Match #{matchId}</div>
          <div className="text-lg font-bold text-neon-cyan mb-2">{date}</div>
          <div className="text-sm">
            Winner: <span className="font-mono">{winner}</span>
          </div>
          <div className="text-sm">
            Gain: <span className="text-neon-green font-bold">{gain}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-neon-yellow">{prize}</div>
          <div className="text-xs text-gray-400 font-mono mt-1">
            {resultHash}
          </div>
        </div>
      </div>
    </div>
  );
}
