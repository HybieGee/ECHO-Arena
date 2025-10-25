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
    refetchInterval: 5000, // Update every 5s for real-time leaderboard
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
                <th className="text-right py-3 px-4">Scans</th>
                <th className="text-right py-3 px-4">Trades</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry: any, index: number) => (
                <tr
                  key={entry.botId}
                  className="border-b border-arena-border hover:bg-arena-hover cursor-pointer transition-colors"
                  onClick={() => setSelectedBotId(entry.botId.toString())}
                >
                  <td className="py-3 px-4">{index + 1}</td>
                  <td className="py-3 px-4 font-mono text-neon-cyan">
                    {entry.botName || 'Unknown Bot'}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {entry.ownerAddress?.slice(0, 6)}...{entry.ownerAddress?.slice(-4)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {entry.balance?.toFixed(4)} BNB
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold ${
                      entry.pnl >= 0 ? 'text-neon-green' : 'text-neon-red'
                    }`}
                  >
                    {entry.pnl >= 0 ? '+' : ''}
                    {entry.pnl?.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right text-echo-cyan">{entry.scans || 0}</td>
                  <td className="py-3 px-4 text-right">{entry.orders || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bot Detail Modal */}
      {selectedBotId && botDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-arena-surface border border-arena-border rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2 text-neon-cyan">
                  {botDetail.bot.name || `Bot #${botDetail.bot.id}`}
                </h2>
                {botDetail.bot.description && (
                  <p className="text-gray-400 mb-2">{botDetail.bot.description}</p>
                )}
                <p className="text-sm text-gray-500 italic">{botDetail.bot.prompt}</p>
              </div>
              <button
                onClick={() => setSelectedBotId(null)}
                className="text-gray-400 hover:text-white text-2xl ml-4"
              >
                ×
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card-arena p-4">
                <div className="text-gray-400 text-sm mb-1">Balance</div>
                <div className="text-xl font-bold">{botDetail.balance?.toFixed(4) || '1.0000'} BNB</div>
              </div>
              <div className="card-arena p-4">
                <div className="text-gray-400 text-sm mb-1">Total Trades</div>
                <div className="text-xl font-bold">{botDetail.stats?.totalOrders || 0}</div>
              </div>
              <div className="card-arena p-4">
                <div className="text-gray-400 text-sm mb-1">Total Scans</div>
                <div className="text-xl font-bold">{botDetail.stats?.totalScans || 0}</div>
              </div>
              <div className="card-arena p-4">
                <div className="text-gray-400 text-sm mb-1">Realized P&L</div>
                <div className={`text-xl font-bold ${
                  (botDetail.stats?.realizedPnL || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
                }`}>
                  {(botDetail.stats?.realizedPnL || 0) >= 0 ? '+' : ''}
                  {(botDetail.stats?.realizedPnL || 0).toFixed(4)} BNB
                </div>
              </div>
            </div>

            {/* Best Trades */}
            {botDetail.bestTrades && botDetail.bestTrades.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3 text-neon-green">Best Trades</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-arena-border">
                        <th className="text-left py-2 px-2">Symbol</th>
                        <th className="text-right py-2 px-2">Buy Price</th>
                        <th className="text-right py-2 px-2">Sell Price</th>
                        <th className="text-right py-2 px-2">P&L</th>
                        <th className="text-right py-2 px-2">P&L %</th>
                        <th className="text-right py-2 px-2">Hold Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {botDetail.bestTrades.map((trade: any, idx: number) => (
                        <tr key={idx} className="border-b border-arena-border hover:bg-arena-hover">
                          <td className="py-2 px-2 font-mono text-neon-cyan">{trade.symbol}</td>
                          <td className="py-2 px-2 text-right">{trade.buyPrice?.toFixed(8)}</td>
                          <td className="py-2 px-2 text-right">{trade.sellPrice?.toFixed(8)}</td>
                          <td className={`py-2 px-2 text-right font-semibold ${
                            (trade.pnl || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
                          }`}>
                            {(trade.pnl || 0) >= 0 ? '+' : ''}
                            {(trade.pnl || 0).toFixed(4)} BNB
                          </td>
                          <td className={`py-2 px-2 text-right font-semibold ${
                            (trade.pnlPct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
                          }`}>
                            {(trade.pnlPct || 0) >= 0 ? '+' : ''}
                            {(trade.pnlPct || 0).toFixed(2)}%
                          </td>
                          <td className="py-2 px-2 text-right text-gray-400">{trade.holdTime} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Worst Trades */}
            {botDetail.worstTrades && botDetail.worstTrades.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3 text-neon-red">Worst Trades</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-arena-border">
                        <th className="text-left py-2 px-2">Symbol</th>
                        <th className="text-right py-2 px-2">Buy Price</th>
                        <th className="text-right py-2 px-2">Sell Price</th>
                        <th className="text-right py-2 px-2">P&L</th>
                        <th className="text-right py-2 px-2">P&L %</th>
                        <th className="text-right py-2 px-2">Hold Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {botDetail.worstTrades.map((trade: any, idx: number) => (
                        <tr key={idx} className="border-b border-arena-border hover:bg-arena-hover">
                          <td className="py-2 px-2 font-mono text-neon-cyan">{trade.symbol}</td>
                          <td className="py-2 px-2 text-right">{trade.buyPrice?.toFixed(8)}</td>
                          <td className="py-2 px-2 text-right">{trade.sellPrice?.toFixed(8)}</td>
                          <td className={`py-2 px-2 text-right font-semibold ${
                            (trade.pnl || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
                          }`}>
                            {(trade.pnl || 0) >= 0 ? '+' : ''}
                            {(trade.pnl || 0).toFixed(4)} BNB
                          </td>
                          <td className={`py-2 px-2 text-right font-semibold ${
                            (trade.pnlPct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
                          }`}>
                            {(trade.pnlPct || 0) >= 0 ? '+' : ''}
                            {(trade.pnlPct || 0).toFixed(2)}%
                          </td>
                          <td className="py-2 px-2 text-right text-gray-400">{trade.holdTime} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Open Positions */}
            {botDetail.positions && botDetail.positions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3">Open Positions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-arena-border">
                        <th className="text-left py-2 px-2">Symbol</th>
                        <th className="text-right py-2 px-2">Qty</th>
                        <th className="text-right py-2 px-2">Entry Price</th>
                        <th className="text-right py-2 px-2">Current Price</th>
                        <th className="text-right py-2 px-2">Market Value</th>
                        <th className="text-right py-2 px-2">Unrealized P&L</th>
                        <th className="text-right py-2 px-2">P&L %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {botDetail.positions.map((pos: any, idx: number) => (
                        <tr key={idx} className="border-b border-arena-border hover:bg-arena-hover">
                          <td className="py-2 px-2 font-mono text-neon-cyan">{pos.symbol}</td>
                          <td className="py-2 px-2 text-right">{pos.qty?.toFixed(4)}</td>
                          <td className="py-2 px-2 text-right">{pos.avgPrice?.toFixed(8)}</td>
                          <td className="py-2 px-2 text-right">{pos.currentPrice?.toFixed(8)}</td>
                          <td className="py-2 px-2 text-right">{pos.marketValue?.toFixed(4)} BNB</td>
                          <td className={`py-2 px-2 text-right font-semibold ${
                            (pos.unrealizedPnL || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
                          }`}>
                            {(pos.unrealizedPnL || 0) >= 0 ? '+' : ''}
                            {(pos.unrealizedPnL || 0).toFixed(4)}
                          </td>
                          <td className={`py-2 px-2 text-right font-semibold ${
                            (pos.unrealizedPnLPct || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'
                          }`}>
                            {(pos.unrealizedPnLPct || 0) >= 0 ? '+' : ''}
                            {(pos.unrealizedPnLPct || 0).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Orders */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-3">Recent Orders</h3>
              {botDetail.orders && botDetail.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-arena-border">
                        <th className="text-left py-2 px-2">Time</th>
                        <th className="text-left py-2 px-2">Symbol</th>
                        <th className="text-left py-2 px-2">Side</th>
                        <th className="text-right py-2 px-2">Qty</th>
                        <th className="text-right py-2 px-2">Fill Price</th>
                        <th className="text-right py-2 px-2">Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {botDetail.orders.slice(0, 50).map((order: any) => (
                        <tr key={order.id} className="border-b border-arena-border hover:bg-arena-hover">
                          <td className="py-2 px-2">
                            {new Date(order.ts).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-2 font-mono text-neon-cyan">{order.symbol}</td>
                          <td
                            className={`py-2 px-2 font-semibold ${
                              order.side === 'buy' ? 'text-neon-green' : 'text-neon-red'
                            }`}
                          >
                            {order.side.toUpperCase()}
                          </td>
                          <td className="py-2 px-2 text-right">{order.qty?.toFixed(4)}</td>
                          <td className="py-2 px-2 text-right">{order.fillPrice?.toFixed(8)}</td>
                          <td className="py-2 px-2 text-right text-gray-400">{order.fee?.toFixed(6)} BNB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">No trades yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
