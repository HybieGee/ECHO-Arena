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
  const maxPositions = dsl.entry?.maxPositions || 3; // Default to 3 positions
  if (state.positions.length < maxPositions) {
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
    // Age filter (with safe defaults)
    if (dsl.universe?.ageMinutesMax && token.ageMins > dsl.universe.ageMinutesMax) {
      return false;
    }

    // Liquidity filter (with safe defaults)
    if (dsl.universe?.minLiquidityBNB && token.liquidityBNB < dsl.universe.minLiquidityBNB) {
      return false;
    }

    // Holders filter (with safe defaults)
    if (dsl.universe?.minHolders && token.holders < dsl.universe.minHolders) {
      return false;
    }

    // Blacklist filters (with safe defaults)
    if (dsl.blacklist?.taxPctMax && token.taxPct > dsl.blacklist.taxPctMax) {
      return false;
    }

    if (dsl.blacklist?.honeypot && token.isHoneypot) {
      return false;
    }

    if (dsl.blacklist?.ownerRenouncedRequired && !token.ownerRenounced) {
      return false;
    }

    if (dsl.blacklist?.lpLockedRequired && !token.lpLocked) {
      return false;
    }

    return true;
  });
}

/**
 * Calculate dynamic position size based on signal strength and strategy
 * This makes each bot's trading amounts unique based on their strategy
 */
function calculateDynamicAllocation(
  dsl: StrategyDSL,
  state: BotState,
  signalScore: number,
  maxAffordable: number,
  slotsAvailable: number
): number {
  // Base allocation from DSL (use as reference point)
  const baseAllocation = dsl.entry.allocationPerPositionBNB;

  // Calculate risk profile based on stop loss % (lower stop = more conservative)
  // Stop loss 5-10% = conservative (0.5-0.7x)
  // Stop loss 15-25% = moderate (0.8-1.0x)
  // Stop loss 30%+ = aggressive (1.2-1.5x)
  const stopLoss = dsl.risk.stopLossPct;
  let riskMultiplier = 1.0;
  if (stopLoss <= 10) {
    riskMultiplier = 0.5 + (stopLoss / 10) * 0.2; // 0.5-0.7x
  } else if (stopLoss <= 25) {
    riskMultiplier = 0.7 + ((stopLoss - 10) / 15) * 0.3; // 0.7-1.0x
  } else {
    riskMultiplier = 1.0 + Math.min((stopLoss - 25) / 25, 0.5); // 1.0-1.5x
  }

  // Calculate confidence multiplier based on signal strength
  // Higher signal score = more confidence = larger position
  const signal = dsl.entry?.signal || 'momentum'; // Default to momentum
  let confidenceMultiplier = 1.0;
  const threshold = dsl.entry?.threshold || 30; // Default to 30% for momentum
  if (signal === 'momentum') {
    // Momentum: 30% = 1.0x, 50% = 1.2x, 100%+ = 1.5x
    if (signalScore > threshold) {
      confidenceMultiplier = 1.0 + Math.min((signalScore - threshold) / threshold * 0.5, 0.5);
    } else {
      confidenceMultiplier = 0.7 + (signalScore / threshold) * 0.3; // 0.7-1.0x
    }
  } else if (signal === 'volumeSpike') {
    // Higher volume ratio = more confidence
    confidenceMultiplier = 0.8 + Math.min(signalScore * 0.2, 0.7); // 0.8-1.5x
  } else if (signal === 'newLaunch') {
    // Newer tokens (higher score) = more aggressive
    confidenceMultiplier = 0.7 + (signalScore / 10) * 0.8; // 0.7-1.5x
  } else {
    // socialBuzz and others
    confidenceMultiplier = 0.8 + Math.min(signalScore * 0.1, 0.7); // 0.8-1.5x
  }

  // Diversification factor - more positions = smaller per position
  // 1 position = 1.2x, 3 positions = 1.0x, 5+ positions = 0.7x
  const maxPositions = dsl.entry?.maxPositions || 3;
  let diversificationMultiplier = 1.0;
  if (maxPositions === 1) {
    diversificationMultiplier = 1.2; // All-in strategy
  } else if (maxPositions === 2) {
    diversificationMultiplier = 1.1;
  } else if (maxPositions >= 5) {
    diversificationMultiplier = 0.7; // Scalper strategy
  }

  // Kelly Criterion-inspired sizing: use % of bankroll based on confidence
  // Higher confidence + lower risk = larger % of bankroll
  const kellyPercentage = (confidenceMultiplier * riskMultiplier * diversificationMultiplier) * 0.15; // Max 15% of bankroll
  const kellyAllocation = state.bnbBalance * kellyPercentage;

  // Use the smaller of: Kelly allocation or DSL base allocation * multipliers
  const dynamicAllocation = Math.min(
    kellyAllocation,
    baseAllocation * riskMultiplier * confidenceMultiplier * diversificationMultiplier
  );

  // Ensure we don't exceed what's affordable
  const finalAllocation = Math.min(dynamicAllocation, maxAffordable);

  // Ensure minimum viable trade size
  return Math.max(finalAllocation, SIM_CONFIG.MIN_TRADE_BNB);
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
  const maxPositions = dsl.entry?.maxPositions || 3;
  const slotsAvailable = maxPositions - state.positions.length;
  if (slotsAvailable <= 0) {
    return intents;
  }

  // Score each candidate based on signal type
  const signal = dsl.entry?.signal || 'momentum';
  const scored = candidates.map(token => ({
    token,
    score: calculateSignalScore(signal, token),
  }));

  // Sort by score (descending) - deterministic
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-breaker: use address for determinism
    return a.token.address.localeCompare(b.token.address);
  });

  // Filter by threshold based on signal type
  // For momentum: threshold is minimum % price change (e.g., 30 for 30%)
  // For volumeSpike: threshold is volume/liquidity ratio
  // For newLaunch: threshold is selectivity (higher = newer only)
  // For socialBuzz: threshold is minimum holder count multiplier
  const thresholdValue = dsl.entry?.threshold || 0;

  let filtered = scored;

  // Apply signal-specific threshold logic
  if (signal === 'momentum') {
    // Threshold as minimum price change percentage
    filtered = scored.filter(s => s.score >= thresholdValue);
  } else if (signal === 'volumeSpike') {
    // Threshold as volume/liquidity ratio
    filtered = scored.filter(s => s.score >= thresholdValue);
  } else if (signal === 'newLaunch') {
    // Higher threshold = newer tokens only (inverse relationship for age)
    filtered = scored.filter(s => s.score >= (10 - thresholdValue));
  } else {
    // socialBuzz and other signals
    filtered = scored.filter(s => s.score >= thresholdValue);
  }

  // Take top candidates that meet threshold
  const topCandidates = filtered.slice(0, slotsAvailable);

  // Generate buy intents
  for (const { token, score } of topCandidates) {
    // Check if we already have this position
    if (state.positions.some(p => p.symbol === token.symbol)) {
      continue;
    }

    // Calculate max affordable amount (with 1% safety margin for fees)
    const safetyMargin = 0.01; // 1% margin for fees and slippage
    const maxAffordable = state.bnbBalance * (1 - safetyMargin);

    // Skip if we can't afford even the minimum viable trade
    if (maxAffordable < SIM_CONFIG.MIN_TRADE_BNB) {
      continue;
    }

    // DYNAMIC ALLOCATION: Calculate position size based on signal strength and strategy
    const allocationAmount = calculateDynamicAllocation(
      dsl,
      state,
      score,
      maxAffordable,
      slotsAvailable
    );

    intents.push({
      side: 'buy',
      symbol: token.symbol,
      tokenAddress: token.address,
      amountBNB: allocationAmount,
      reason: `${signal} signal (score: ${score.toFixed(2)}, allocation: ${allocationAmount.toFixed(4)} BNB)`,
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
      // Token not in current universe - skip for now, don't force sell
      // The universe refreshes every 10s and tokens rotate in/out
      // Only sell based on actual price movements, not API pagination
      console.log(`Position ${position.symbol} not in current universe, holding position`);
      continue;
    }

    const currentPrice = token.priceInBNB;
    const entryPrice = position.avgPrice;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

    console.log(`Position ${position.symbol}: Entry ${entryPrice.toFixed(8)}, Current ${currentPrice.toFixed(8)}, P&L ${pnlPct.toFixed(2)}%`);

    // Check take profit
    if (pnlPct >= dsl.risk.takeProfitPct) {
      console.log(`TAKE PROFIT triggered for ${position.symbol} at ${pnlPct.toFixed(2)}%`);
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
      console.log(`STOP LOSS triggered for ${position.symbol} at ${pnlPct.toFixed(2)}%`);
      intents.push({
        side: 'sell',
        symbol: position.symbol,
        tokenAddress: position.tokenAddress,
        amountBNB: position.qty * currentPrice,
        reason: `Stop loss (${pnlPct.toFixed(2)}% loss)`,
      });
      continue;
    }

    // Check time limit (only if configured)
    if (dsl.exits.timeLimitMin > 0) {
      const timeSinceEntry = (currentTime - position.entryTime) / 1000 / 60; // minutes
      if (timeSinceEntry >= dsl.exits.timeLimitMin) {
        console.log(`TIME LIMIT triggered for ${position.symbol} after ${timeSinceEntry.toFixed(0)} min`);
        intents.push({
          side: 'sell',
          symbol: position.symbol,
          tokenAddress: position.tokenAddress,
          amountBNB: position.qty * currentPrice,
          reason: `Time limit (${timeSinceEntry.toFixed(0)} min)`,
        });
        continue;
      }
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
