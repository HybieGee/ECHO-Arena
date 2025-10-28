/**
 * MatchCoordinator Durable Object
 * Manages 24h match lifecycle and simulation execution
 * Runs deterministic simulation loops for all bots in a match
 */

import { DurableObject } from 'cloudflare:workers';
import type { StrategyDSL } from '@echo-arena/dsl';
import {
  createBotState,
  executeTrade,
  updateUnrealizedPnL,
  calculateTotalValue,
  calculateGainPercent,
  calculatePrize,
  evaluateStrategy,
  sortBotsDeterministically,
  type BotState,
  type Token,
} from '@echo-arena/sim';
import { createGeckoTerminalService } from '../lib/geckoterminal';

interface Bot {
  id: number;
  owner_address: string;
  prompt_dsl: StrategyDSL;
}

interface BalanceSnapshot {
  timestamp: number;
  balances: { botId: number; balance: number }[];
}

interface MatchState {
  matchId: number;
  startTs: number;
  endTs: number;
  bots: Bot[];
  botStates: Map<number, BotState>;
  isRunning: boolean;
  lastTickTs: number;
  balanceHistory: BalanceSnapshot[];
}

export class MatchCoordinator extends DurableObject {
  private state: MatchState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Load state from storage on initialization
   */
  async initialize() {
    this.state = await this.ctx.storage.get('matchState');
  }

  /**
   * Initialize a new match
   */
  async startMatch(matchId: number, startTs: number, endTs: number, bots: Bot[]) {
    // Sort bots deterministically for fair execution
    const sortedBots = sortBotsDeterministically(bots);

    // Initialize bot states
    const botStates = new Map<number, BotState>();
    for (const bot of sortedBots) {
      botStates.set(bot.id, createBotState(bot.id));
    }

    this.state = {
      matchId,
      startTs,
      endTs,
      bots: sortedBots,
      botStates,
      isRunning: true,
      lastTickTs: startTs,
      balanceHistory: [],
    };

    // Store initial state
    await this.ctx.storage.put('matchState', this.state);

    // Schedule first alarm to start simulation loop (start in 1 minute)
    await this.ctx.storage.setAlarm(Date.now() + 60000);

    return { success: true, message: 'Match started' };
  }

  /**
   * Alarm handler - runs simulation tick every 1-3 minutes
   */
  async alarm() {
    await this.simulationTick();

    // Schedule next alarm if match is still running
    if (this.state && this.state.isRunning) {
      // Random interval between 1-3 minutes (60000-180000 ms)
      const randomInterval = 60000 + Math.random() * 120000;
      await this.ctx.storage.setAlarm(Date.now() + randomInterval);
    }
  }

  /**
   * Single simulation tick
   * 1. Fetch universe (live prices)
   * 2. For each bot (in deterministic order):
   *    - Evaluate strategy → generate trade intents
   *    - Execute trades
   *    - Update balances
   * 3. Persist snapshots
   */
  private async simulationTick() {
    // Ensure state is loaded
    if (!this.state) {
      this.state = await this.ctx.storage.get('matchState');
    }

    if (!this.state || !this.state.isRunning) return;

    const currentTime = Date.now();

    // Check if match has ended
    if (currentTime >= this.state.endTs) {
      await this.settleMatch();
      return;
    }

    try {
      // Fetch universe (live token prices)
      const universe = await this.fetchUniverse();

      // Build price map for PnL updates
      const priceMap = new Map<string, number>();
      for (const token of universe) {
        priceMap.set(token.symbol, token.priceInBNB);
      }

      // Process each bot in deterministic order
      for (const bot of this.state.bots) {
        const botState = this.state.botStates.get(bot.id);
        if (!botState) {
          console.error(`Bot ${bot.id} state not found`);
          continue;
        }

        // Evaluate strategy and get trade intents
        botState.scanCount++; // Increment scan counter
        const intents = evaluateStrategy(
          bot.prompt_dsl,
          botState,
          universe,
          currentTime,
          bot.id // Use bot ID as RNG seed for determinism
        );

        if (intents.length > 0) {
          console.log(`Bot ${bot.id}: Scan #${botState.scanCount}, ${intents.length} trade intents`);
        }

        // Execute each trade intent
        for (const intent of intents) {
          const token = universe.find(t => t.symbol === intent.symbol);
          if (!token) {
            console.error(`Token ${intent.symbol} not found in universe`);
            continue;
          }

          console.log(`Bot ${bot.id}: Executing ${intent.side.toUpperCase()} ${intent.symbol} (${token.address.slice(0, 8)}...${token.address.slice(-6)}) | Amount: ${intent.amountBNB.toFixed(4)} BNB | Price: ${token.priceInBNB.toFixed(10)} BNB`);

          const result = executeTrade(botState, intent, token, currentTime);

          if (result.success && result.order) {
            console.log(`Bot ${bot.id}: ✅ Trade successful! ${intent.side.toUpperCase()} ${result.order.qty.toFixed(4)} ${intent.symbol} @ ${result.order.fillPrice.toFixed(10)} BNB | Fee: ${result.order.fee.toFixed(6)} BNB`);
            // Persist order to storage
            await this.persistOrder(result.order);
          } else {
            console.error(`Bot ${bot.id}: ❌ Trade failed - ${result.error}`);
          }
        }

        // Update unrealized PnL
        updateUnrealizedPnL(botState, priceMap);

        // Persist balance snapshot on every tick (since ticks are 1-3 min apart)
        await this.persistBalance(botState, currentTime);
      }

      // Record balance snapshot for history
      const snapshot: BalanceSnapshot = {
        timestamp: currentTime,
        balances: Array.from(this.state.botStates.entries()).map(([botId, state]) => ({
          botId,
          balance: calculateTotalValue(state, priceMap),
        })),
      };
      this.state.balanceHistory.push(snapshot);

      // Keep last 5 snapshots (approx 5-15 minutes of history at 1-3 min intervals)
      // CRITICAL: Reduced from 10 to 5 to prevent exceeding Durable Object 128KB storage limit
      if (this.state.balanceHistory.length > 5) {
        this.state.balanceHistory = this.state.balanceHistory.slice(-5);
      }

      // CRITICAL: Trim orders array for each bot to prevent storage bloat
      // Keep only last 10 orders per bot (with 51 bots, this is 510 orders max vs unlimited growth)
      for (const botState of this.state.botStates.values()) {
        if (botState.orders.length > 10) {
          botState.orders = botState.orders.slice(-10);
        }
      }

      this.state.lastTickTs = currentTime;
      await this.ctx.storage.put('matchState', this.state);
    } catch (error) {
      console.error('Simulation tick error:', error);
    }
  }

  /**
   * Fetch token universe from GeckoTerminal API
   * Gets BSC tokens with rate limiting and credit tracking
   *
   * IMPORTANT: Always fetches FRESH data for simulation (skipCache=true)
   * This ensures bots trade on real-time prices, not stale cached data
   */
  private async fetchUniverse(): Promise<Token[]> {
    const geckoService = createGeckoTerminalService(this.env);
    // skipCache=true: Always get fresh prices for simulation
    // Cache is only used for leaderboard/user views (via routes)
    return await geckoService.fetchBSCTokens(true);
  }

  /**
   * Fallback four.meme tokens in case API fails
   * Multiple tokens with varying ages to match different bot strategies
   */
  private getFallbackTokens(): Token[] {
    const baseTime = Date.now();
    const priceVariation = Math.sin(baseTime / 10000) * 0.1 + 1;

    return [
      // Fresh token (< 10 min)
      {
        address: '0x1234567890123456789012345678901234564444',
        symbol: 'FRESH4',
        priceInBNB: 0.0001 * priceVariation,
        liquidityBNB: 50,
        holders: 35,
        ageMins: 8,
        taxPct: 0,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 150000,
        priceChange24h: 45.5 * priceVariation,
      },
      // Medium fresh token (< 30 min)
      {
        address: '0x9876543210987654321098765432109876544444',
        symbol: 'MED4',
        priceInBNB: 0.0005 * priceVariation,
        liquidityBNB: 80,
        holders: 60,
        ageMins: 25,
        taxPct: 0,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 200000,
        priceChange24h: 25.5 * priceVariation,
      },
    ];
  }

  /**
   * Persist order to D1 database
   */
  private async persistOrder(order: any) {
    // CRITICAL FIX: Don't store in Durable Object - causes 128KB limit exceeded
    // Orders and balances are tracked in botState and balanceHistory
    // D1 persistence would happen via Worker env binding (not implemented yet)
    // For now, skip storage to prevent unbounded array growth
  }

  /**
   * Persist balance snapshot to D1 database
   */
  private async persistBalance(botState: BotState, timestamp: number) {
    // CRITICAL FIX: Don't store in Durable Object - causes 128KB limit exceeded
    // Balance snapshots are already tracked in this.state.balanceHistory
    // D1 persistence would happen via Worker env binding (not implemented yet)
    // For now, skip storage to prevent unbounded array growth
  }

  /**
   * Settle match at end
   * Updates D1 database with winners and final match status
   */
  private async settleMatch() {
    if (!this.state) return;

    console.log(`Settling match ${this.state.matchId}...`);

    this.state.isRunning = false;

    // Cancel any pending alarms
    await this.ctx.storage.deleteAlarm();

    // Calculate final standings
    const universe = await this.fetchUniverse();
    const priceMap = new Map<string, number>();
    for (const token of universe) {
      priceMap.set(token.symbol, token.priceInBNB);
    }

    const results = [];
    for (const bot of this.state.bots) {
      const botState = this.state.botStates.get(bot.id);
      if (!botState) continue;

      updateUnrealizedPnL(botState, priceMap);
      const totalValue = calculateTotalValue(botState, priceMap);
      const gainPct = calculateGainPercent(botState, priceMap);

      results.push({
        bot_id: bot.id,
        owner_address: bot.owner_address,
        final_balance: totalValue,
        gain_pct: gainPct,
      });
    }

    // Sort by final balance (descending)
    results.sort((a, b) => b.final_balance - a.final_balance);

    // Store locally in DO
    await this.ctx.storage.put('finalResults', results);
    await this.ctx.storage.put('matchState', this.state);

    try {
      // CRITICAL: Update D1 database with winners
      for (const [index, result] of results.entries()) {
        const prizeAmount = index === 0 ? calculatePrize(result.gain_pct) : 0;

        await (this.env as any).DB.prepare(
          'INSERT INTO winners (match_id, bot_id, owner_address, start_balance, end_balance, pct_gain, prize_bnb) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            this.state.matchId,
            result.bot_id,
            result.owner_address,
            1.0,
            result.final_balance,
            result.gain_pct,
            prizeAmount
          )
          .run();
      }

      // Generate result hash (SHA-256 of results JSON)
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(results));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const resultHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Store result hash in KV
      await (this.env as any).RESULTS.put(`match-${this.state.matchId}`, JSON.stringify(results));

      // Update match status to 'settled' in D1
      await (this.env as any).DB.prepare('UPDATE matches SET status = ?, result_hash = ? WHERE id = ?')
        .bind('settled', resultHash, this.state.matchId)
        .run();

      console.log(`Match ${this.state.matchId} settled successfully. Winner: ${results[0]?.owner_address} with ${results[0]?.final_balance.toFixed(4)} BNB (+${results[0]?.gain_pct.toFixed(2)}%)`);

      // AUTOMATIC MATCH ROTATION: Create and start next match immediately
      await this.createNextMatch();
    } catch (error) {
      console.error(`Error updating D1 during settlement for match ${this.state.matchId}:`, error);
      throw error;
    }
  }

  /**
   * Automatically create and start the next match
   * Called after current match settles to ensure 24/7 continuous matches
   */
  private async createNextMatch() {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const nextMatchStart = currentTime;
      const nextMatchEnd = currentTime + 24 * 3600; // 24 hours from now

      console.log('Creating next match automatically...');

      // Create new match in D1
      const newMatch = await (this.env as any).DB.prepare(
        'INSERT INTO matches (start_ts, end_ts, status) VALUES (?, ?, ?) RETURNING *'
      )
        .bind(nextMatchStart, nextMatchEnd, 'running')
        .first();

      if (!newMatch) {
        console.error('Failed to create next match');
        return;
      }

      const newMatchId = newMatch.id;
      console.log(`Created new match ${newMatchId}, starting automatically...`);

      // Get the new match coordinator instance
      const newMatchCoordinatorId = (this.env as any).MATCH_COORDINATOR.idFromName(`match-${newMatchId}`);
      const newMatchStub = (this.env as any).MATCH_COORDINATOR.get(newMatchCoordinatorId);

      // Start the new match with empty bots array (bots will join via spawn)
      await newMatchStub.fetch('https://match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: newMatchId,
          startTs: nextMatchStart * 1000, // Convert to milliseconds
          endTs: nextMatchEnd * 1000,
          bots: [], // Empty array - bots join dynamically
        }),
      });

      console.log(`New match ${newMatchId} started automatically! 24/7 rotation active.`);
    } catch (error) {
      console.error('Error creating next match:', error);
      // Don't throw - we don't want to crash the settlement process
    }
  }

  /**
   * Get current leaderboard
   */
  async getLeaderboard() {
    // Ensure state is loaded
    if (!this.state) {
      this.state = await this.ctx.storage.get('matchState');
    }

    if (!this.state) {
      return { error: 'No active match' };
    }

    const universe = await this.fetchUniverse();
    const priceMap = new Map<string, number>();
    for (const token of universe) {
      priceMap.set(token.symbol, token.priceInBNB);
    }

    const leaderboard = [];
    for (const bot of this.state.bots) {
      const botState = this.state.botStates.get(bot.id);
      if (!botState) continue;

      updateUnrealizedPnL(botState, priceMap);
      const totalValue = calculateTotalValue(botState, priceMap);
      const gainPct = calculateGainPercent(botState, priceMap);

      leaderboard.push({
        bot_id: bot.id,
        owner_address: bot.owner_address,
        balance: totalValue,
        gain_pct: gainPct,
        trades: botState.orderCount,
        scans: botState.scanCount,
      });
    }

    // Sort by balance descending
    leaderboard.sort((a, b) => b.balance - a.balance);

    return leaderboard;
  }

  /**
   * Handle HTTP requests
   */
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/start' && request.method === 'POST') {
      const body = await request.json();
      const result = await this.startMatch(
        body.matchId,
        body.startTs,
        body.endTs,
        body.bots
      );
      return Response.json(result);
    }

    if (url.pathname === '/reset' && request.method === 'POST') {
      // Clear all corrupted state and restart fresh
      console.log('🔄 RESETTING MATCH - Clearing all state to fix corrupted balances');

      // Clear all storage
      await this.ctx.storage.deleteAll();

      // Reset state variable
      this.state = null;

      // Re-initialize
      await this.initialize();

      // If bots provided, restart match immediately
      const body = await request.json();
      if (body.matchId && body.bots) {
        console.log(`Restarting match ${body.matchId} with ${body.bots.length} bots`);
        await this.startMatch(body.matchId, body.startTs, body.endTs, body.bots);
      }

      return Response.json({ success: true, message: 'Match reset successfully - all balances cleared' });
    }

    if (url.pathname === '/leaderboard' && request.method === 'GET') {
      const leaderboard = await this.getLeaderboard();
      return Response.json(leaderboard);
    }

    if (url.pathname === '/history' && request.method === 'GET') {
      // Ensure state is loaded
      if (!this.state) {
        this.state = await this.ctx.storage.get('matchState');
      }

      if (!this.state) {
        return Response.json({ error: 'No active match' });
      }

      return Response.json({
        balanceHistory: this.state.balanceHistory || []
      });
    }

    if (url.pathname === '/results' && request.method === 'GET') {
      const results = await this.ctx.storage.get('finalResults');
      return Response.json(results || []);
    }

    if (url.pathname.startsWith('/bot/') && request.method === 'GET') {
      const botId = parseInt(url.pathname.split('/')[2]);
      const botDetails = await this.getBotDetails(botId);
      return Response.json(botDetails);
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Get detailed trading data for a specific bot
   */
  async getBotDetails(botId: number) {
    // Ensure state is loaded
    if (!this.state) {
      this.state = await this.ctx.storage.get('matchState');
    }

    if (!this.state) {
      return { error: 'No active match' };
    }

    const botState = this.state.botStates.get(botId);
    if (!botState) {
      return { error: 'Bot not found in match' };
    }

    // Get orders from botState (stored in memory, not DO storage)
    const botOrders = botState.orders || [];

    // Get current universe for position valuation
    const universe = await this.fetchUniverse();
    const priceMap = new Map<string, number>();
    for (const token of universe) {
      priceMap.set(token.symbol, token.priceInBNB);
    }

    // Calculate position details with current prices
    const positions = botState.positions.map(pos => {
      const currentPrice = priceMap.get(pos.symbol) || pos.avgPrice;
      const marketValue = pos.qty * currentPrice;
      const costBasis = pos.qty * pos.avgPrice;
      const unrealizedPnL = marketValue - costBasis;
      const unrealizedPnLPct = ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100;

      return {
        symbol: pos.symbol,
        qty: pos.qty,
        avgPrice: pos.avgPrice,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnL,
        unrealizedPnLPct,
        entryTime: pos.entryTime,
      };
    });

    // Calculate P&L for completed trades (buy-sell pairs)
    const completedTrades: any[] = [];
    const symbolTrades = new Map<string, any[]>();

    // Group orders by symbol
    for (const order of botOrders) {
      if (!symbolTrades.has(order.symbol)) {
        symbolTrades.set(order.symbol, []);
      }
      symbolTrades.get(order.symbol)!.push(order);
    }

    // Match buy-sell pairs and calculate P&L
    for (const [symbol, trades] of symbolTrades.entries()) {
      const buys = trades.filter(t => t.side === 'buy');
      const sells = trades.filter(t => t.side === 'sell');

      // Match each sell with previous buys
      for (const sell of sells) {
        const correspondingBuys = buys.filter(b => b.ts < sell.ts);
        if (correspondingBuys.length > 0) {
          // Use most recent buy before this sell
          const buy = correspondingBuys[correspondingBuys.length - 1];

          // Calculate P&L
          const costBasis = buy.qty * buy.fillPrice;
          const proceeds = sell.qty * sell.fillPrice;
          const pnl = proceeds - costBasis;
          const pnlPct = (pnl / costBasis) * 100;

          completedTrades.push({
            symbol,
            buyTime: buy.ts,
            sellTime: sell.ts,
            buyPrice: buy.fillPrice,
            sellPrice: sell.fillPrice,
            qty: sell.qty,
            costBasis,
            proceeds,
            pnl,
            pnlPct,
            holdTime: Math.floor((sell.ts - buy.ts) / 1000 / 60), // minutes
          });
        }
      }
    }

    // Sort by P&L to get best and worst trades
    const sortedByPnL = [...completedTrades].sort((a, b) => b.pnl - a.pnl);
    const bestTrades = sortedByPnL.slice(0, 5); // Top 5 best trades
    const worstTrades = sortedByPnL.slice(-5).reverse(); // Top 5 worst trades

    return {
      botId,
      balance: botState.bnbBalance,
      positions,
      orders: botOrders.slice(-50), // Last 50 orders
      completedTrades,
      bestTrades,
      worstTrades,
      stats: {
        totalOrders: botState.orderCount,
        totalScans: botState.scanCount,
        realizedPnL: botState.pnlRealized,
        unrealizedPnL: botState.pnlUnrealized,
        totalTrades: completedTrades.length,
        avgPnLPerTrade: completedTrades.length > 0
          ? completedTrades.reduce((sum, t) => sum + t.pnl, 0) / completedTrades.length
          : 0,
      },
    };
  }
}
