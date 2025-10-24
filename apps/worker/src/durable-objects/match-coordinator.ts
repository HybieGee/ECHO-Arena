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
  private tickInterval: number | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
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

    // Start simulation loop
    this.startSimulation();

    return { success: true, message: 'Match started' };
  }

  /**
   * Start the simulation loop
   * Runs every 10 seconds to evaluate strategies and execute trades
   */
  private startSimulation() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    // Run simulation tick every 10 seconds
    this.tickInterval = setInterval(async () => {
      await this.simulationTick();
    }, 10000) as unknown as number;
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
        if (!botState) continue;

        // Evaluate strategy and get trade intents
        const intents = evaluateStrategy(
          bot.prompt_dsl,
          botState,
          universe,
          currentTime,
          bot.id // Use bot ID as RNG seed for determinism
        );

        // Execute each trade intent
        for (const intent of intents) {
          const token = universe.find(t => t.symbol === intent.symbol);
          if (!token) continue;

          const result = executeTrade(botState, intent, token, currentTime);

          if (result.success && result.order) {
            // Persist order to storage
            await this.persistOrder(result.order);
          }
        }

        // Update unrealized PnL
        updateUnrealizedPnL(botState, priceMap);

        // Persist balance snapshot every minute
        if (currentTime - this.state.lastTickTs >= 60000) {
          await this.persistBalance(botState, currentTime);
        }
      }

      this.state.lastTickTs = currentTime;
      await this.ctx.storage.put('matchState', this.state);
    } catch (error) {
      console.error('Simulation tick error:', error);
    }
  }

  /**
   * Fetch token universe from Dexscreener
   * Mock implementation - returns sample tokens
   */
  private async fetchUniverse(): Promise<Token[]> {
    // TODO: Implement actual Dexscreener API integration
    // For now, return mock tokens for testing
    return [
      {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'MOCK1',
        priceInBNB: 0.001,
        liquidityBNB: 50,
        holders: 100,
        ageMins: 120,
        taxPct: 5,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 10000,
        priceChange24h: 15.5,
      },
      {
        address: '0x2234567890123456789012345678901234567890',
        symbol: 'MOCK2',
        priceInBNB: 0.0005,
        liquidityBNB: 30,
        holders: 80,
        ageMins: 60,
        taxPct: 3,
        isHoneypot: false,
        ownerRenounced: true,
        lpLocked: true,
        volumeUSD24h: 25000,
        priceChange24h: 45.2,
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

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

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

    if (url.pathname === '/leaderboard' && request.method === 'GET') {
      const leaderboard = await this.getLeaderboard();
      return Response.json(leaderboard);
    }

    if (url.pathname === '/results' && request.method === 'GET') {
      const results = await this.ctx.storage.get('finalResults');
      return Response.json(results || []);
    }

    return new Response('Not found', { status: 404 });
  }
}
