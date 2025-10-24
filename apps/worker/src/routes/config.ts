/**
 * Config API route
 * Returns public configuration settings
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { SIM_CONFIG } from '@echo-arena/sim';

export const configRoute = new Hono<{ Bindings: Env }>();

configRoute.get('/', async (c) => {
  const config = {
    simulation: {
      startBalanceBNB: SIM_CONFIG.START_BALANCE_BNB,
      takerFeePct: SIM_CONFIG.TAKER_FEE_PCT,
      latencyMs: SIM_CONFIG.LATENCY_MS,
      slippageBps: SIM_CONFIG.SLIPPAGE_BPS,
      maxOrdersPerDay: SIM_CONFIG.MAX_ORDERS_PER_BOT_PER_DAY,
      cooldownSec: SIM_CONFIG.COOLDOWN_SEC,
      matchDurationHours: SIM_CONFIG.MATCH_DURATION_HOURS,
    },
    prizes: {
      multiplier: SIM_CONFIG.PRIZE_MULTIPLIER,
      capPct: SIM_CONFIG.PRIZE_CAP_PCT,
      capBNB: SIM_CONFIG.PRIZE_CAP_BNB,
    },
    freeWeek: {
      start: c.env.FREE_START,
      end: c.env.FREE_END,
    },
    burnAmount: {
      bnbEquiv: 0.01,
      deadAddress: '0x000000000000000000000000000000000000dEaD',
    },
  };

  return c.json(config);
});
