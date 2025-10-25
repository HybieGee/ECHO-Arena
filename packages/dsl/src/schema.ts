import { z } from 'zod';

/**
 * ECHO Arena Trading Bot Strategy DSL Schema
 * Defines the structure for bot trading strategies
 */

// Signal types for entry conditions
export const SignalTypeSchema = z.enum([
  'momentum',
  'volumeSpike',
  'newLaunch',
  'socialBuzz'
]);

// Universe filter: which tokens to consider
export const UniverseSchema = z.object({
  ageMinutesMax: z.number().int().positive().max(10080).default(1440), // max 1 week
  minLiquidityBNB: z.number().positive().default(10),
  minHolders: z.number().int().nonnegative().default(50),
});

// Entry conditions: when to buy
export const EntrySchema = z.object({
  signal: SignalTypeSchema,
  threshold: z.number().positive().min(0.5).max(10).default(2.0), // Signal strength multiplier - lower = more aggressive, higher = more selective
  maxPositions: z.number().int().positive().max(5).default(3),
  allocationPerPositionBNB: z.number().positive().min(0.01).max(1.0).default(0.3), // Capped at 1 BNB (start balance) with 0.01 BNB minimum
});

// Risk management rules
export const RiskSchema = z.object({
  takeProfitPct: z.number().positive().min(5).max(500).default(20),
  stopLossPct: z.number().positive().min(5).max(50).default(15),
  cooldownSec: z.number().int().nonnegative().default(5),
});

// Exit conditions
export const ExitsSchema = z.object({
  timeLimitMin: z.number().int().nonnegative().max(1440).default(0), // 0 = no limit, max 24h
  trailingStopPct: z.number().nonnegative().max(30).default(0), // 0 = no trailing stop
});

// Token blacklist criteria
export const BlacklistSchema = z.object({
  taxPctMax: z.number().min(0).max(100).default(10),
  honeypot: z.boolean().default(true), // if true, reject honeypots
  ownerRenouncedRequired: z.boolean().default(false),
  lpLockedRequired: z.boolean().default(true),
});

// Complete strategy DSL schema
export const StrategyDSLSchema = z.object({
  universe: UniverseSchema,
  entry: EntrySchema,
  risk: RiskSchema,
  exits: ExitsSchema,
  blacklist: BlacklistSchema.optional().default({
    taxPctMax: 10,
    honeypot: true,
    ownerRenouncedRequired: false,
    lpLockedRequired: true,
  }),
});

// TypeScript types derived from schemas
export type SignalType = z.infer<typeof SignalTypeSchema>;
export type Universe = z.infer<typeof UniverseSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type Exits = z.infer<typeof ExitsSchema>;
export type Blacklist = z.infer<typeof BlacklistSchema>;
export type StrategyDSL = z.infer<typeof StrategyDSLSchema>;

/**
 * Default strategy for testing and examples
 */
export const DEFAULT_STRATEGY: StrategyDSL = {
  universe: {
    ageMinutesMax: 1440,
    minLiquidityBNB: 10,
    minHolders: 50,
  },
  entry: {
    signal: 'momentum',
    threshold: 2.0,
    maxPositions: 3,
    allocationPerPositionBNB: 0.3,
  },
  risk: {
    takeProfitPct: 20,
    stopLossPct: 15,
    cooldownSec: 5,
  },
  exits: {
    timeLimitMin: 0,
    trailingStopPct: 0,
  },
  blacklist: {
    taxPctMax: 10,
    honeypot: true,
    ownerRenouncedRequired: false,
    lpLockedRequired: true,
  },
};
