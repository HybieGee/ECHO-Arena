/**
 * Simulation engine core logic
 * Handles order execution, fee calculation, slippage, and latency
 */

import { SIM_CONFIG } from './config';
import { BotState, Order, Position, Token, TradeIntent, TradeResult } from './types';

/**
 * Initialize a new bot state
 */
export function createBotState(botId: number): BotState {
  return {
    id: botId,
    bnbBalance: SIM_CONFIG.START_BALANCE_BNB,
    positions: [],
    orders: [],
    lastOrderTime: 0,
    orderCount: 0,
    scanCount: 0,
    pnlRealized: 0,
    pnlUnrealized: 0,
  };
}

/**
 * Execute a trade intent and return the result
 * Applies fees, slippage, and validates constraints
 */
export function executeTrade(
  state: BotState,
  intent: TradeIntent,
  token: Token,
  currentTime: number
): TradeResult {
  // NOTE: Cooldown check removed - doesn't apply in virtual time simulation
  // Real-time cooldown would prevent multiple trades within same tick
  // MAX_ORDERS_PER_BOT_PER_DAY still limits total trading volume

  // Validate order count
  if (state.orderCount >= SIM_CONFIG.MAX_ORDERS_PER_BOT_PER_DAY) {
    return {
      success: false,
      error: `Max orders (${SIM_CONFIG.MAX_ORDERS_PER_BOT_PER_DAY}) reached for today.`,
    };
  }

  // Apply latency (in real execution, this would be a delay)
  const executionTime = currentTime + SIM_CONFIG.LATENCY_MS;

  if (intent.side === 'buy') {
    return executeBuy(state, intent, token, executionTime);
  } else {
    return executeSell(state, intent, token, executionTime);
  }
}

/**
 * Execute a buy order
 */
function executeBuy(
  state: BotState,
  intent: TradeIntent,
  token: Token,
  executionTime: number
): TradeResult {
  // Validate sufficient balance (with safety margin for fees)
  const estimatedFee = intent.amountBNB * (SIM_CONFIG.TAKER_FEE_PCT / 100);
  const totalRequired = intent.amountBNB + estimatedFee * 0.1; // Add 10% buffer on fee estimate

  if (intent.amountBNB > state.bnbBalance || totalRequired > state.bnbBalance) {
    return {
      success: false,
      error: `Insufficient balance. Have ${state.bnbBalance.toFixed(4)}, need ${intent.amountBNB.toFixed(4)} BNB`,
    };
  }

  // Additional safety: ensure minimum balance remains
  if (state.bnbBalance - intent.amountBNB < 0) {
    return {
      success: false,
      error: `Trade would result in negative balance`,
    };
  }

  // Apply slippage
  const slippageFactor = 1 + SIM_CONFIG.SLIPPAGE_PCT / 100;
  const fillPrice = token.priceInBNB * slippageFactor;

  // Calculate fee
  const fee = intent.amountBNB * (SIM_CONFIG.TAKER_FEE_PCT / 100);
  const netAmount = intent.amountBNB - fee;

  // Calculate quantity received
  const qty = netAmount / fillPrice;

  // Create order
  const order: Order = {
    id: state.orders.length + 1,
    botId: state.id,
    ts: executionTime,
    symbol: intent.symbol,
    tokenAddress: intent.tokenAddress,
    side: 'buy',
    qty,
    fillPrice,
    fee,
    slippageBps: SIM_CONFIG.SLIPPAGE_BPS,
  };

  // Update state
  state.bnbBalance -= intent.amountBNB;
  state.orders.push(order);
  state.orderCount++;
  state.lastOrderTime = executionTime;

  // Add or update position (match by contract address, not symbol)
  const existingPos = state.positions.find(p => p.tokenAddress === intent.tokenAddress);
  if (existingPos) {
    // Update average price
    const totalQty = existingPos.qty + qty;
    existingPos.avgPrice = (existingPos.avgPrice * existingPos.qty + fillPrice * qty) / totalQty;
    existingPos.qty = totalQty;
  } else {
    state.positions.push({
      symbol: intent.symbol,
      tokenAddress: intent.tokenAddress,
      qty,
      avgPrice: fillPrice,
      entryTime: executionTime,
      unrealizedPnL: 0,
    });
  }

  return { success: true, order };
}

/**
 * Execute a sell order
 */
function executeSell(
  state: BotState,
  intent: TradeIntent,
  token: Token,
  executionTime: number
): TradeResult {
  // Find position (match by contract address, not symbol)
  const position = state.positions.find(p => p.tokenAddress === intent.tokenAddress);
  if (!position) {
    return {
      success: false,
      error: `No position found for ${intent.symbol}`,
    };
  }

  // For sell, amountBNB is the value we want to sell
  // Calculate quantity to sell
  const qtyToSell = Math.min(position.qty, intent.amountBNB / token.priceInBNB);

  if (qtyToSell <= 0) {
    return {
      success: false,
      error: 'Invalid sell quantity',
    };
  }

  // Apply slippage (negative for sells)
  const slippageFactor = 1 - SIM_CONFIG.SLIPPAGE_PCT / 100;
  const fillPrice = token.priceInBNB * slippageFactor;

  // Calculate gross proceeds
  const grossProceeds = qtyToSell * fillPrice;

  // Calculate fee
  const fee = grossProceeds * (SIM_CONFIG.TAKER_FEE_PCT / 100);
  const netProceeds = grossProceeds - fee;

  // Calculate realized PnL
  const costBasis = qtyToSell * position.avgPrice;
  const realizedPnL = netProceeds - costBasis;

  // Create order
  const order: Order = {
    id: state.orders.length + 1,
    botId: state.id,
    ts: executionTime,
    symbol: intent.symbol,
    tokenAddress: intent.tokenAddress,
    side: 'sell',
    qty: qtyToSell,
    fillPrice,
    fee,
    slippageBps: SIM_CONFIG.SLIPPAGE_BPS,
  };

  // Update state
  state.bnbBalance += netProceeds;
  state.pnlRealized += realizedPnL;
  state.orders.push(order);
  state.orderCount++;
  state.lastOrderTime = executionTime;

  // Update position
  position.qty -= qtyToSell;
  if (position.qty < 0.0001) {
    // Remove position if fully closed
    const idx = state.positions.indexOf(position);
    state.positions.splice(idx, 1);
  }

  return { success: true, order };
}

/**
 * Update unrealized PnL for all positions
 */
export function updateUnrealizedPnL(state: BotState, prices: Map<string, number>): void {
  let totalUnrealized = 0;

  for (const pos of state.positions) {
    // CRITICAL: Look up price by contract address, not symbol (multiple tokens can share same symbol)
    const currentPrice = prices.get(pos.tokenAddress);
    if (currentPrice) {
      const marketValue = pos.qty * currentPrice;
      const costBasis = pos.qty * pos.avgPrice;
      pos.unrealizedPnL = marketValue - costBasis;
      totalUnrealized += pos.unrealizedPnL;
    }
  }

  state.pnlUnrealized = totalUnrealized;
}

/**
 * Calculate total portfolio value (cash + positions)
 */
export function calculateTotalValue(state: BotState, prices: Map<string, number>): number {
  let positionsValue = 0;

  for (const pos of state.positions) {
    // CRITICAL: Look up price by contract address, not symbol (multiple tokens can share same symbol)
    const currentPrice = prices.get(pos.tokenAddress) || pos.avgPrice;
    positionsValue += pos.qty * currentPrice;
  }

  return state.bnbBalance + positionsValue;
}

/**
 * Calculate percentage gain from start
 */
export function calculateGainPercent(state: BotState, prices: Map<string, number>): number {
  const totalValue = calculateTotalValue(state, prices);
  return ((totalValue - SIM_CONFIG.START_BALANCE_BNB) / SIM_CONFIG.START_BALANCE_BNB) * 100;
}

/**
 * Calculate prize amount based on gain
 */
export function calculatePrize(gainPercent: number): number {
  // No prize for negative gains (losses)
  if (gainPercent <= 0) {
    return 0;
  }

  // Cap gain at 500%
  const cappedGain = Math.min(gainPercent, SIM_CONFIG.PRIZE_CAP_PCT);

  // Prize = 1.0 BNB * min(gainPct, 500%)
  const prize = SIM_CONFIG.PRIZE_MULTIPLIER * (cappedGain / 100);

  // Apply absolute cap of 5 BNB
  return Math.min(prize, SIM_CONFIG.PRIZE_CAP_BNB);
}
