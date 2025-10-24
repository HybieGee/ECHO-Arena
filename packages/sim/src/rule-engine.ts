/**
 * Deterministic rule engine
 * Consumes DSL + live token feed and produces trade intents
 * No randomness, no RL - fully deterministic
 */

import type { StrategyDSL } from '@echo-arena/dsl';
import { BotState, Token, TradeIntent } from './types';
import { SIM_CONFIG } from './config';

/**
 * Evaluate strategy and generate trade intents
 * This function is deterministic - same inputs always produce same outputs
 */
export function evaluateStrategy(
  dsl: StrategyDSL,
  state: BotState,
  universe: Token[],
  currentTime: number,
  rngSeed: number // Seed for any RNG to ensure determinism
): TradeIntent[] {
  const intents: TradeIntent[] = [];

  // Filter universe based on DSL criteria
  const candidates = filterUniverse(dsl, universe);

  // Check for exit signals first
  const exitIntents = checkExits(dsl, state, universe, currentTime);
  intents.push(...exitIntents);

  // Check for entry signals if we have room for new positions
  if (state.positions.length < dsl.entry.maxPositions) {
    const entryIntents = checkEntries(dsl, state, candidates, currentTime, rngSeed);
    intents.push(...entryIntents);
  }

  return intents;
}

/**
 * Filter token universe based on DSL criteria
 */
function filterUniverse(dsl: StrategyDSL, universe: Token[]): Token[] {
  return universe.filter(token => {
    // Age filter
    if (token.ageMins > dsl.universe.ageMinutesMax) {
      return false;
    }

    // Liquidity filter
    if (token.liquidityBNB < dsl.universe.minLiquidityBNB) {
      return false;
    }

    // Holders filter
    if (token.holders < dsl.universe.minHolders) {
      return false;
    }

    // Blacklist filters
    if (token.taxPct > dsl.blacklist.taxPctMax) {
      return false;
    }

    if (dsl.blacklist.honeypot && token.isHoneypot) {
      return false;
    }

    if (dsl.blacklist.ownerRenouncedRequired && !token.ownerRenounced) {
      return false;
    }

    if (dsl.blacklist.lpLockedRequired && !token.lpLocked) {
      return false;
    }

    return true;
  });
}

/**
 * Check for entry signals
 */
function checkEntries(
  dsl: StrategyDSL,
  state: BotState,
  candidates: Token[],
  currentTime: number,
  rngSeed: number
): TradeIntent[] {
  const intents: TradeIntent[] = [];

  // Calculate available slots
  const slotsAvailable = dsl.entry.maxPositions - state.positions.length;
  if (slotsAvailable <= 0) {
    return intents;
  }

  // Score each candidate based on signal type
  const scored = candidates.map(token => ({
    token,
    score: calculateSignalScore(dsl.entry.signal, token),
  }));

  // Sort by score (descending) - deterministic
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-breaker: use address for determinism
    return a.token.address.localeCompare(b.token.address);
  });

  // Take top candidates that meet threshold
  const topCandidates = scored
    .filter(s => s.score >= dsl.entry.threshold)
    .slice(0, slotsAvailable);

  // Generate buy intents
  for (const { token } of topCandidates) {
    // Check if we already have this position
    if (state.positions.some(p => p.symbol === token.symbol)) {
      continue;
    }

    // Check if we have enough balance
    if (state.bnbBalance < dsl.entry.allocationPerPositionBNB) {
      continue;
    }

    intents.push({
      side: 'buy',
      symbol: token.symbol,
      tokenAddress: token.address,
      amountBNB: dsl.entry.allocationPerPositionBNB,
      reason: `${dsl.entry.signal} signal (score: ${scored.find(s => s.token === token)?.score.toFixed(2)})`,
    });
  }

  return intents;
}

/**
 * Check for exit signals on existing positions
 */
function checkExits(
  dsl: StrategyDSL,
  state: BotState,
  universe: Token[],
  currentTime: number
): TradeIntent[] {
  const intents: TradeIntent[] = [];

  // Build price map for quick lookup
  const priceMap = new Map<string, Token>();
  for (const token of universe) {
    priceMap.set(token.symbol, token);
  }

  for (const position of state.positions) {
    const token = priceMap.get(position.symbol);
    if (!token) {
      // Token not in current universe - exit position
      intents.push({
        side: 'sell',
        symbol: position.symbol,
        tokenAddress: position.tokenAddress,
        amountBNB: position.qty * position.avgPrice, // Sell entire position
        reason: 'Token no longer in universe',
      });
      continue;
    }

    const currentPrice = token.priceInBNB;
    const entryPrice = position.avgPrice;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Check take profit
    if (pnlPct >= dsl.risk.takeProfitPct) {
      intents.push({
        side: 'sell',
        symbol: position.symbol,
        tokenAddress: position.tokenAddress,
        amountBNB: position.qty * currentPrice,
        reason: `Take profit (${pnlPct.toFixed(2)}% gain)`,
      });
      continue;
    }

    // Check stop loss
    if (pnlPct <= -dsl.risk.stopLossPct) {
      intents.push({
        side: 'sell',
        symbol: position.symbol,
        tokenAddress: position.tokenAddress,
        amountBNB: position.qty * currentPrice,
        reason: `Stop loss (${pnlPct.toFixed(2)}% loss)`,
      });
      continue;
    }

    // Check time limit
    const timeSinceEntry = (currentTime - position.entryTime) / 1000 / 60; // minutes
    if (timeSinceEntry >= dsl.exits.timeLimitMin) {
      intents.push({
        side: 'sell',
        symbol: position.symbol,
        tokenAddress: position.tokenAddress,
        amountBNB: position.qty * currentPrice,
        reason: `Time limit (${timeSinceEntry.toFixed(0)} min)`,
      });
      continue;
    }

    // TODO: Implement trailing stop (requires tracking high water mark)
  }

  return intents;
}

/**
 * Calculate signal score for a token (deterministic)
 */
function calculateSignalScore(signal: string, token: Token): number {
  switch (signal) {
    case 'momentum':
      // Use 24h price change as momentum signal
      return token.priceChange24h || 0;

    case 'volumeSpike':
      // Use 24h volume relative to liquidity
      if (!token.volumeUSD24h) return 0;
      const volumeToLiqRatio = token.volumeUSD24h / (token.liquidityBNB * 300); // Assume BNB = $300
      return volumeToLiqRatio;

    case 'newLaunch':
      // Younger = higher score
      const maxAge = 1440; // 24 hours
      return (maxAge - token.ageMins) / maxAge * 10;

    case 'socialBuzz':
      // For now, use holders as proxy for social interest
      return Math.log10(token.holders + 1);

    default:
      return 0;
  }
}

/**
 * Sort bots deterministically by owner address
 * This ensures fair execution ordering
 */
export function sortBotsDeterministically<T extends { owner_address: string }>(
  bots: T[]
): T[] {
  return [...bots].sort((a, b) =>
    a.owner_address.toLowerCase().localeCompare(b.owner_address.toLowerCase())
  );
}
