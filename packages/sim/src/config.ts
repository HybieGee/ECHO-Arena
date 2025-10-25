/**
 * Simulation engine configuration constants
 * These values are hardcoded per the spec
 */

export const SIM_CONFIG = {
  // Starting balance for each bot
  START_BALANCE_BNB: 1.0,

  // Minimum viable trade size (to prevent dust trades)
  MIN_TRADE_BNB: 0.01,

  // Trading fees (0.25% per trade)
  TAKER_FEE_PCT: 0.25,

  // Latency model (2 seconds per order)
  LATENCY_MS: 2000,

  // Slippage model (10 basis points = 0.1%)
  SLIPPAGE_BPS: 10,
  SLIPPAGE_PCT: 0.1,

  // Order limits
  MAX_ORDERS_PER_BOT_PER_DAY: 1000,
  COOLDOWN_SEC: 5,

  // Universe refresh cadence
  UNIVERSE_REFRESH_SEC: 10,

  // Match duration
  MATCH_DURATION_HOURS: 24,

  // Prize calculation
  PRIZE_MULTIPLIER: 1.0,
  PRIZE_CAP_PCT: 500, // 500% max gain
  PRIZE_CAP_BNB: 5.0, // 5 BNB absolute cap
} as const;

export type SimConfig = typeof SIM_CONFIG;
