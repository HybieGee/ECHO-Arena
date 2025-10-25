/**
 * Arena page
 * Live leaderboard with bot details
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Color palette for bot lines
const BOT_COLORS = [
  '#00ffff', // neon-cyan
  '#ff00ff', // echo-magenta
  '#00ff00', // neon-green
  '#ffff00', // yellow
  '#ff0080', // pink
  '#0080ff', // blue
  '#ff8000', // orange
  '#80ff00', // lime
];

// Custom tooltip that shows only top 10 bots by balance
const CustomTooltip = ({ active, payload, label, leaderboard }: any) => {
  if (!active || !payload || !payload.length) return null;

  // Get all bot data from the payload and sort by balance (highest first)
  const sortedBots = payload
    .filter((entry: any) => entry.dataKey && entry.dataKey.startsWith('bot'))
    .map((entry: any) => {
      const botId = entry.dataKey.replace('bot', '');
      const bot = leaderboard.find((b: any) => b.botId.toString() === botId);
      return {
        botId,
        botName: bot?.botName || `Bot #${botId}`,
        balance: parseFloat(entry.value || 0),
        color: entry.color,
      };
    })
    .sort((a: any, b: any) => b.balance - a.balance)
    .slice(0, 10); // Only keep top 10

  return (
    <div
      style={{
        backgroundColor: '#0f0f1e',
        border: '1px solid #00ffff40',
        borderRadius: '8px',
        padding: '12px',
        color: '#fff',
        fontSize: '13px',
      }}
    >
      <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sortedBots.map((bot: any, index: number) => (
          <div key={bot.botId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                backgroundColor: bot.color,
                borderRadius: '2px',
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, color: '#ddd', fontSize: '12px' }}>
              {bot.botName}
            </span>
            <span style={{ fontWeight: 'bold', color: index === 0 ? '#00ff00' : '#fff' }}>
              {bot.balance.toFixed(4)} BNB
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ArenaPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const historyRef = useRef<any[]>([]);

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

  // Only show top 50 bots in chart (by balance)
  const top50Bots = [...leaderboard]
    .sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0))
    .slice(0, 50);

  // Fetch history from server on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await api.getMatchHistory();

        if (data.balanceHistory && data.balanceHistory.length > 0) {
          // Convert server history to chart format
          const convertedHistory = data.balanceHistory.map((snapshot: any) => {
            const time = new Date(snapshot.timestamp).toLocaleTimeString('en-US', {
              hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const dataPoint: any = { time };
            snapshot.balances.forEach((bot: any) => {
              dataPoint[`bot${bot.botId}`] = bot.balance;
            });
            return dataPoint;
          });
          historyRef.current = convertedHistory;
          setBalanceHistory(convertedHistory);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    }
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Create data point with top 50 bot balances only
    const dataPoint: any = { time: timeStr };
    const topBots = [...leaderboard]
      .sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 50);

    topBots.forEach((bot: any) => {
      const botKey = `bot${bot.botId}`;
      dataPoint[botKey] = parseFloat(bot.balance || 0);
    });

    // Add to history (keep last 60 data points = 5 minutes at 5s intervals)
    historyRef.current = [...historyRef.current, dataPoint].slice(-60);
    setBalanceHistory(historyRef.current);
  }, [leaderboard]);

  return (
    <div className="container-arena py-12">
      <h1 className="text-4xl font-bold mb-8 neon-text text-center">
        LIVE ARENA
      </h1>

      {/* Live Balance Chart */}
      {balanceHistory.length > 0 && top50Bots.length > 0 && (
        <div className="card-arena p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-echo-cyan">Live Performance Chart</h2>
            <div className="text-sm text-gray-400">
              Showing top {Math.min(top50Bots.length, 50)} bots · Updates every 5s
            </div>
          </div>

          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  domain={[0.8, 'auto']}
                  label={{
                    value: 'Balance (BNB)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#888',
                    fontSize: 12
                  }}
                />
                <Tooltip content={(props) => <CustomTooltip {...props} leaderboard={leaderboard} />} />
                {top50Bots.map((bot: any, index: number) => (
                  <Line
                    key={`bot${bot.botId}`}
                    type="monotone"
                    dataKey={`bot${bot.botId}`}
                    stroke={BOT_COLORS[index % BOT_COLORS.length]}
                    strokeWidth={index < 5 ? 2.5 : 1.5}
                    dot={false}
                    animationDuration={300}
                    opacity={index < 10 ? 0.9 : 0.6}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 Legend - Scrollable */}
          <div className="mt-4 border-t border-arena-border pt-4">
            <div className="text-sm text-gray-400 mb-2">Top 10 Bots:</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 max-h-20 overflow-y-auto custom-scrollbar">
              {top50Bots.slice(0, 10).map((bot: any, index: number) => (
                <div key={bot.botId} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: BOT_COLORS[index % BOT_COLORS.length] }}
                  />
                  <span className="text-gray-300 truncate">{bot.botName || `Bot #${bot.botId}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
