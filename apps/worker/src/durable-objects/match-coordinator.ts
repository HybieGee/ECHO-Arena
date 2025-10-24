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

    // Schedule first alarm to start simulation loop (run immediately)
    await this.ctx.storage.setAlarm(Date.now() + 100);

    return { success: true, message: 'Match started' };
  }

  /**
   * Alarm handler - runs simulation tick every 10 seconds
   */
  async alarm() {
    await this.simulationTick();

    // Schedule next alarm if match is still running
    if (this.state && this.state.isRunning) {
      await this.ctx.storage.setAlarm(Date.now() + 10000); // 10 seconds
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
   * Mock implementation - returns sample tokens with varying prices
   */
  private async fetchUniverse(): Promise<Token[]> {
    // TODO: Implement actual Dexscreener API integration
    // For now, return mock tokens with simulated price movement
    const baseTime = Date.now();
    const priceVariation = Math.sin(baseTime / 10000) * 0.1 + 1; // Oscillates between 0.9 and 1.1

    return [
      {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'MOMENTUM',
        priceInBNB: 0.001 * priceVariation,
        liquidityBNB: 150,
        holders: 120,
        ageMins: 120,
        taxPct: 5,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 150000, // High volume for momentum
        priceChange24h: 35.5 * priceVariation,
      },
      {
        address: '0x2234567890123456789012345678901234567890',
        symbol: 'VOLUME',
        priceInBNB: 0.0005 * (1 / priceVariation),
        liquidityBNB: 200,
        holders: 150,
        ageMins: 60,
        taxPct: 3,
        isHoneypot: false,
        ownerRenounced: true,
        lpLocked: true,
        volumeUSD24h: 200000, // Very high volume
        priceChange24h: 45.2,
      },
      {
        address: '0x3234567890123456789012345678901234567890',
        symbol: 'NEWTOKEN',
        priceInBNB: 0.002 * priceVariation,
        liquidityBNB: 120,
        holders: 90,
        ageMins: 30,
        taxPct: 4,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 100000,
        priceChange24h: 80.0, // High price change for new launch
      },
      {
        address: '0x4234567890123456789012345678901234567890',
        symbol: 'SOCIAL',
        priceInBNB: 0.0008 * (1 / priceVariation),
        liquidityBNB: 180,
        holders: 200,
        ageMins: 180,
        taxPct: 6,
        isHoneypot: false,
        ownerRenounced: true,
        lpLocked: true,
        volumeUSD24h: 120000,
        priceChange24h: 28.5,
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
