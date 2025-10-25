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
  evaluateStrategy,
  sortBotsDeterministically,
  type BotState,
  type Token,
} from '@echo-arena/sim';

interface Bot {
  id: number;
  owner_address: string;
  prompt_dsl: StrategyDSL;
}

interface MatchState {
  matchId: number;
  startTs: number;
  endTs: number;
  bots: Bot[];
  botStates: Map<number, BotState>;
  isRunning: boolean;
  lastTickTs: number;
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
          console.log(`Bot ${bot.id}: Executing ${intent.side} ${intent.symbol} for ${intent.amountBNB} BNB`);
          const token = universe.find(t => t.symbol === intent.symbol);
          if (!token) {
            console.error(`Token ${intent.symbol} not found in universe`);
            continue;
          }

          const result = executeTrade(botState, intent, token, currentTime);

          if (result.success && result.order) {
            console.log(`Bot ${bot.id}: Trade successful! Order ID ${result.order.id}`);
            // Persist order to storage
            await this.persistOrder(result.order);
          } else {
            console.error(`Bot ${bot.id}: Trade failed - ${result.error}`);
          }
        }

        // Update unrealized PnL
        updateUnrealizedPnL(botState, priceMap);

        // Persist balance snapshot on every tick (since ticks are 1-3 min apart)
        await this.persistBalance(botState, currentTime);
      }

      this.state.lastTickTs = currentTime;
      await this.ctx.storage.put('matchState', this.state);
    } catch (error) {
      console.error('Simulation tick error:', error);
    }
  }

  /**
   * Fetch token universe from GeckoTerminal API
   * Gets new and trending BSC tokens from four.meme and other DEXes
   */
  private async fetchUniverse(): Promise<Token[]> {
    try {
      // Fetch both new and trending pools from BSC
      const [newPoolsResponse, trendingPoolsResponse] = await Promise.all([
        fetch('https://api.geckoterminal.com/api/v2/networks/bsc/new_pools?page=1'),
        fetch('https://api.geckoterminal.com/api/v2/networks/bsc/trending_pools?page=1'),
      ]);

      const newPools = await newPoolsResponse.json();
      const trendingPools = await trendingPoolsResponse.json();

      // Combine and deduplicate pools
      const allPoolsMap = new Map();

      [...(newPools.data || []), ...(trendingPools.data || [])].forEach((pool: any) => {
        allPoolsMap.set(pool.id, pool);
      });

      // Get BNB price in USD for conversion
      const bnbPriceUSD = 600; // Approximate BNB price, could fetch live

      // Transform pools to Token format
      const tokens: Token[] = [];

      for (const pool of Array.from(allPoolsMap.values()).slice(0, 50)) {
        const attrs = pool.attributes;

        // Skip if missing critical data
        if (!attrs.base_token_price_native_currency || !attrs.reserve_in_usd) {
          continue;
        }

        // Calculate age in minutes
        const createdAt = new Date(attrs.pool_created_at).getTime();
        const ageMins = Math.floor((Date.now() - createdAt) / 1000 / 60);

        // Skip tokens older than 24 hours (1440 mins)
        if (ageMins > 1440) {
          continue;
        }

        // Extract token symbol from pool name (format: "TOKEN / BNB")
        const symbol = attrs.name.split(' / ')[0].substring(0, 20); // Limit symbol length

        // Convert liquidity from USD to BNB
        const liquidityBNB = parseFloat(attrs.reserve_in_usd) / bnbPriceUSD;

        // Skip if liquidity too low
        if (liquidityBNB < 5) {
          continue;
        }

        // CRITICAL: Validate price to prevent unrealistic profits from bad data
        const priceInBNB = parseFloat(attrs.base_token_price_native_currency);
        if (!priceInBNB || priceInBNB <= 0) {
          console.log(`⚠️ Rejecting ${symbol} - invalid price: ${priceInBNB}`);
          continue;
        }
        if (priceInBNB < 0.000000001) {
          console.log(`⚠️ Rejecting ${symbol} - price too low: ${priceInBNB}`);
          continue;
        }

        // Get 24h volume
        const volumeUSD24h = parseFloat(attrs.volume_usd?.h24 || '0');

        // Get price change percentage
        const priceChange24h = parseFloat(attrs.price_change_percentage?.h24 || '0');

        // Estimate holder count based on transaction activity
        const txData = attrs.transactions?.h24 || {};
        const holders = Math.max(
          (txData.buyers || 0) + (txData.sellers || 0),
          50 // Minimum estimate
        );

        tokens.push({
          address: pool.relationships?.base_token?.data?.id?.split('_')[1] || pool.id,
          symbol,
          priceInBNB, // Use validated price
          liquidityBNB,
          holders,
          ageMins,
          taxPct: 0, // GeckoTerminal doesn't provide tax info, assume 0
          isHoneypot: false, // Assume verified pools on GeckoTerminal are safe
          ownerRenounced: false, // Unknown, assume false for safety
          lpLocked: true, // Assume true for pools on GeckoTerminal
          volumeUSD24h,
          priceChange24h,
        });
      }

      console.log(`Fetched ${tokens.length} tokens from BSC (new + trending)`);

      // Return at least some tokens, fallback to mock if API fails
      if (tokens.length === 0) {
        console.warn('No tokens fetched from GeckoTerminal, using fallback token');
        return this.getFallbackTokens();
      }

      return tokens;
    } catch (error) {
      console.error('Error fetching universe from GeckoTerminal:', error);
      return this.getFallbackTokens();
    }
  }

  /**
   * Fallback tokens in case API fails
   */
  private getFallbackTokens(): Token[] {
    const baseTime = Date.now();
    const priceVariation = Math.sin(baseTime / 10000) * 0.1 + 1;

    return [
      {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'FALLBACK',
        priceInBNB: 0.001 * priceVariation,
        liquidityBNB: 150,
        holders: 120,
        ageMins: 120,
        taxPct: 5,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 150000,
        priceChange24h: 35.5 * priceVariation,
      },
    ];
  }

  /**
   * Persist order to D1 database
   */
  private async persistOrder(order: any) {
    // This would be called via the Worker env binding
    // For now, just store in Durable Object storage
    const orders = (await this.ctx.storage.get('orders')) || [];
    orders.push(order);
    await this.ctx.storage.put('orders', orders);
  }

  /**
   * Persist balance snapshot to D1 database
   */
  private async persistBalance(botState: BotState, timestamp: number) {
    const balances = (await this.ctx.storage.get('balances')) || [];
    balances.push({
      bot_id: botState.id,
      ts: timestamp,
      bnb_balance: botState.bnbBalance,
      positions: JSON.stringify(botState.positions),
      pnl_realized: botState.pnlRealized,
      pnl_unrealized: botState.pnlUnrealized,
    });
    await this.ctx.storage.put('balances', balances);
  }

  /**
   * Settle match at end
   */
  private async settleMatch() {
    if (!this.state) return;

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

    await this.ctx.storage.put('finalResults', results);
    await this.ctx.storage.put('matchState', this.state);

    console.log(`Match ${this.state.matchId} settled. Winner: ${results[0]?.owner_address}`);
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

    // Get orders from storage
    const orders = (await this.ctx.storage.get('orders')) || [];
    const botOrders = orders.filter((o: any) => o.botId === botId);

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
