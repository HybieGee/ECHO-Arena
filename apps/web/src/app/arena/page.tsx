/**
 * Arena page
 * Live leaderboard with bot details
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function ArenaPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: api.getLeaderboard,
    refetchInterval: 60000, // Update every minute
  });

  const { data: botDetail } = useQuery({
    queryKey: ['bot', selectedBotId],
    queryFn: () => api.getBot(selectedBotId!),
    enabled: !!selectedBotId,
  });

  const leaderboard = leaderboardData?.leaderboard || [];

  return (
    <div className="container-arena py-12">
      <h1 className="text-4xl font-bold mb-8 neon-text text-center">
        LIVE ARENA
      </h1>

      {isLoading ? (
        <div className="text-center text-gray-400">Loading leaderboard...</div>
      ) : (
        <div className="card-arena overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-arena-border">
                <th className="text-left py-3 px-4">Rank</th>
                <th className="text-left py-3 px-4">Bot</th>
                <th className="text-left py-3 px-4">Owner</th>
                <th className="text-right py-3 px-4">Balance</th>
                <th className="text-right py-3 px-4">Gain %</th>
                <th className="text-right py-3 px-4">Trades</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry: any, index: number) => (
                <tr
                  key={entry.bot_id}
                  className="border-b border-arena-border hover:bg-arena-hover cursor-pointer transition-colors"
                  onClick={() => setSelectedBotId(entry.bot_id.toString())}
                >
                  <td className="py-3 px-4">{index + 1}</td>
                  <td className="py-3 px-4 font-mono text-neon-cyan">
                    {entry.botName}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {entry.owner_address.slice(0, 6)}...{entry.owner_address.slice(-4)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {entry.balance.toFixed(4)} BNB
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold ${
                      entry.gain_pct >= 0 ? 'text-neon-green' : 'text-neon-red'
                    }`}
                  >
                    {entry.gain_pct >= 0 ? '+' : ''}
                    {entry.gain_pct.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right">{entry.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bot Detail Modal */}
      {selectedBotId && botDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-arena-surface border border-arena-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Bot #{botDetail.bot.id}
                </h2>
                <p className="text-gray-400">{botDetail.bot.prompt}</p>
              </div>
              <button
                onClick={() => setSelectedBotId(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Orders */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">Recent Orders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-arena-border">
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-left py-2">Side</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {botDetail.orders.slice(0, 10).map((order: any) => (
                      <tr key={order.id} className="border-b border-arena-border">
                        <td className="py-2">
                          {new Date(order.ts).toLocaleTimeString()}
                        </td>
                        <td className="py-2">{order.symbol}</td>
                        <td
                          className={`py-2 ${
                            order.side === 'buy' ? 'text-neon-green' : 'text-neon-red'
                          }`}
                        >
                          {order.side.toUpperCase()}
                        </td>
                        <td className="py-2 text-right">{order.qty.toFixed(4)}</td>
                        <td className="py-2 text-right">{order.fill_price.toFixed(8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
