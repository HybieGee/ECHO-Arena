/**
 * Admin page
 * Match control and winner payouts (admin only)
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AdminPage() {
  const [authToken, setAuthToken] = useState('');

  const { data: unpaidWinners } = useQuery({
    queryKey: ['unpaid-winners'],
    queryFn: api.admin.getUnpaidWinners,
    enabled: !!authToken,
  });

  const createMatchMutation = useMutation({
    mutationFn: () => api.admin.createMatch(),
  });

  const startMatchMutation = useMutation({
    mutationFn: (matchId: string) => api.admin.startMatch(matchId),
  });

  const settleMatchMutation = useMutation({
    mutationFn: (matchId: string) => api.admin.settleMatch(matchId),
  });

  return (
    <div className="container-arena py-12">
      <h1 className="text-4xl font-bold mb-8 neon-text text-center">
        ADMIN PANEL
      </h1>

      {/* Auth */}
      <div className="card-arena mb-8">
        <label className="block text-sm font-semibold mb-2">
          Admin Address (for Authorization)
        </label>
        <input
          type="text"
          className="input-arena w-full"
          placeholder="0x..."
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
        />
      </div>

      {/* Match Management */}
      <div className="card-arena mb-8">
        <h2 className="text-2xl font-bold mb-4">Match Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => createMatchMutation.mutate()}
            className="btn-primary"
            disabled={createMatchMutation.isPending || !authToken}
          >
            Create New Match
          </button>
          <button
            onClick={() => {
              const matchId = prompt('Enter Match ID to start:');
              if (matchId) startMatchMutation.mutate(matchId);
            }}
            className="btn-secondary"
            disabled={startMatchMutation.isPending || !authToken}
          >
            Start Match
          </button>
          <button
            onClick={() => {
              const matchId = prompt('Enter Match ID to settle:');
              if (matchId) settleMatchMutation.mutate(matchId);
            }}
            className="btn-secondary"
            disabled={settleMatchMutation.isPending || !authToken}
          >
            Settle Match
          </button>
        </div>
      </div>

      {/* Unpaid Winners */}
      <div className="card-arena">
        <h2 className="text-2xl font-bold mb-4">Unpaid Winners</h2>
        {unpaidWinners?.winners?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-arena-border">
                  <th className="text-left py-2">Match</th>
                  <th className="text-left py-2">Winner</th>
                  <th className="text-right py-2">Prize</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaidWinners.winners.map((winner: any) => (
                  <tr key={winner.id} className="border-b border-arena-border">
                    <td className="py-2">#{winner.match_id}</td>
                    <td className="py-2 font-mono text-sm">
                      {winner.owner_address.slice(0, 10)}...
                    </td>
                    <td className="py-2 text-right font-bold text-neon-yellow">
                      {winner.prize_bnb} BNB
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => {
                          const txHash = prompt('Enter payment tx hash:');
                          if (txHash) {
                            api.admin.markPaid(winner.id.toString(), txHash);
                          }
                        }}
                        className="btn-secondary text-sm"
                      >
                        Mark Paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No unpaid winners
          </div>
        )}
      </div>
    </div>
  );
}
