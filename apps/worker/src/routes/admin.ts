/**
 * Admin routes
 * Match management and prize payouts (admin-only)
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { calculatePrize } from '@echo-arena/sim';
import { createGeckoTerminalService } from '../lib/geckoterminal';

export const adminRoutes = new Hono<{ Bindings: Env }>();

/**
 * Middleware to check admin authorization
 */
async function checkAdmin(c: any, next: any) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Extract address from Bearer token (in production, verify signature)
  const address = authHeader.replace('Bearer ', '');

  // Check if address is in allowlist
  const allowlist = c.env.ALLOWLIST_ADMINS.split(',').map((a: string) => a.toLowerCase());

  if (!allowlist.includes(address.toLowerCase())) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
}

adminRoutes.use('/*', checkAdmin);

/**
 * POST /api/admin/match/create
 * Create a new match
 */
adminRoutes.post('/match/create', async (c) => {
  try {
    const { startTs, durationHours = 24 } = await c.req.json();

    // CRITICAL: Check for existing active matches
    const activeMatch = await c.env.DB.prepare(
      "SELECT id, status FROM matches WHERE status IN ('pending', 'running') LIMIT 1"
    ).first();

    if (activeMatch) {
      return c.json({
        error: `Cannot create new match. Match ${activeMatch.id} is already ${activeMatch.status}. Please settle it first.`,
        existingMatchId: activeMatch.id,
        existingMatchStatus: activeMatch.status,
      }, 409);
    }

    const start = startTs || Math.floor(Date.now() / 1000);
    const end = start + durationHours * 3600;

    const result = await c.env.DB.prepare(
      'INSERT INTO matches (start_ts, end_ts, status) VALUES (?, ?, ?) RETURNING *'
    )
      .bind(start, end, 'pending')
      .first();

    if (!result) {
      return c.json({ error: 'Failed to create match' }, 500);
    }

    return c.json({
      success: true,
      match: {
        id: result.id,
        startTs: result.start_ts,
        endTs: result.end_ts,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('Error creating match:', error);
    return c.json({ error: 'Failed to create match' }, 500);
  }
});

/**
 * POST /api/admin/match/:id/reset
 * Reset a match (clears all corrupted state and restarts)
 */
adminRoutes.post('/match/:id/reset', async (c) => {
  try {
    const matchId = c.req.param('id');

    // Get match
    const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
      .bind(matchId)
      .first();

    if (!match) {
      return c.json({ error: 'Match not found' }, 404);
    }

    // Get all bots for this match
    const bots = await c.env.DB.prepare(
      'SELECT id, owner_address, prompt_dsl FROM bots WHERE match_id = ?'
    )
      .bind(matchId)
      .all();

    // Reset Durable Object
    const id = c.env.MATCH_COORDINATOR.idFromName(`match-${matchId}`);
    const stub = c.env.MATCH_COORDINATOR.get(id);

    const response = await stub.fetch('https://match/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: parseInt(matchId),
        startTs: match.start_ts * 1000,
        endTs: match.end_ts * 1000,
        bots: (bots.results || []).map((bot: any) => ({
          id: bot.id,
          owner_address: bot.owner_address,
          prompt_dsl: JSON.parse(bot.prompt_dsl),
        })),
      }),
    });

    const result = await response.json();

    return c.json({
      success: true,
      message: 'Match reset and restarted with clean state',
      result,
    });
  } catch (error) {
    console.error('Error resetting match:', error);
    return c.json({ error: 'Failed to reset match' }, 500);
  }
});

/**
 * POST /api/admin/match/:id/start
 * Start a match (initialize Durable Object)
 */
adminRoutes.post('/match/:id/start', async (c) => {
  try {
    const matchId = c.req.param('id');

    // Get match
    const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
      .bind(matchId)
      .first();

    if (!match) {
      return c.json({ error: 'Match not found' }, 404);
    }

    // CRITICAL: Check for existing running matches (excluding this one)
    const runningMatch = await c.env.DB.prepare(
      "SELECT id FROM matches WHERE status = 'running' AND id != ? LIMIT 1"
    )
      .bind(matchId)
      .first();

    if (runningMatch) {
      return c.json({
        error: `Cannot start match ${matchId}. Match ${runningMatch.id} is already running. Please settle it first.`,
        runningMatchId: runningMatch.id,
      }, 409);
    }

    // Update status to running
    await c.env.DB.prepare('UPDATE matches SET status = ? WHERE id = ?')
      .bind('running', matchId)
      .run();

    // Get all bots for this match
    const bots = await c.env.DB.prepare(
      'SELECT id, owner_address, prompt_dsl FROM bots WHERE match_id = ?'
    )
      .bind(matchId)
      .all();

    // Initialize Durable Object
    const id = c.env.MATCH_COORDINATOR.idFromName(`match-${matchId}`);
    const stub = c.env.MATCH_COORDINATOR.get(id);

    const response = await stub.fetch('https://match/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: parseInt(matchId),
        startTs: match.start_ts * 1000,
        endTs: match.end_ts * 1000,
        bots: (bots.results || []).map((bot: any) => ({
          id: bot.id,
          owner_address: bot.owner_address,
          prompt_dsl: JSON.parse(bot.prompt_dsl),
        })),
      }),
    });

    const result = await response.json();

    return c.json({
      success: true,
      message: 'Match started',
      result,
    });
  } catch (error) {
    console.error('Error starting match:', error);
    return c.json({ error: 'Failed to start match' }, 500);
  }
});

/**
 * POST /api/admin/match/:id/settle
 * Settle a match and calculate winners
 */
adminRoutes.post('/match/:id/settle', async (c) => {
  try {
    const matchId = c.req.param('id');

    // Get match
    const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
      .bind(matchId)
      .first();

    if (!match) {
      return c.json({ error: 'Match not found' }, 404);
    }

    // Get final results from DO
    const id = c.env.MATCH_COORDINATOR.idFromName(`match-${matchId}`);
    const stub = c.env.MATCH_COORDINATOR.get(id);
    const response = await stub.fetch('https://match/results');
    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
      return c.json({ error: 'No results available' }, 400);
    }

    // Calculate prizes and insert winners
    for (const [index, result] of results.entries()) {
      const prizeAmount = index === 0 ? calculatePrize(result.gain_pct) : 0;

      await c.env.DB.prepare(
        'INSERT INTO winners (match_id, bot_id, owner_address, start_balance, end_balance, pct_gain, prize_bnb) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          matchId,
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

    // Store result hash in KV (IPFS stub)
    await c.env.RESULTS.put(`match-${matchId}`, JSON.stringify(results));

    // Update match status
    await c.env.DB.prepare('UPDATE matches SET status = ?, result_hash = ? WHERE id = ?')
      .bind('settled', resultHash, matchId)
      .run();

    return c.json({
      success: true,
      matchId,
      resultHash,
      winnersCount: results.length,
      topWinner: results[0],
    });
  } catch (error) {
    console.error('Error settling match:', error);
    return c.json({ error: 'Failed to settle match' }, 500);
  }
});

/**
 * POST /api/admin/winner/:id/mark-paid
 * Mark a winner as paid
 */
adminRoutes.post('/winner/:id/mark-paid', async (c) => {
  try {
    const winnerId = c.req.param('id');
    const { txHash } = await c.req.json();

    if (!txHash) {
      return c.json({ error: 'Missing txHash' }, 400);
    }

    const result = await c.env.DB.prepare(
      'UPDATE winners SET paid = 1, paid_tx = ? WHERE id = ?'
    )
      .bind(txHash, winnerId)
      .run();

    if (!result.success) {
      return c.json({ error: 'Failed to update winner' }, 500);
    }

    return c.json({
      success: true,
      winnerId,
      txHash,
    });
  } catch (error) {
    console.error('Error marking winner as paid:', error);
    return c.json({ error: 'Failed to mark as paid' }, 500);
  }
});

/**
 * GET /api/admin/winners/unpaid
 * Get all unpaid winners
 */
adminRoutes.get('/winners/unpaid', async (c) => {
  try {
    const winners = await c.env.DB.prepare(
      'SELECT * FROM winners WHERE paid = 0 AND prize_bnb > 0 ORDER BY match_id DESC'
    ).all();

    return c.json({
      winners: winners.results || [],
    });
  } catch (error) {
    console.error('Error fetching unpaid winners:', error);
    return c.json({ error: 'Failed to fetch winners' }, 500);
  }
});

/**
 * GET /api/admin/api-usage
 * Get GeckoTerminal API usage statistics
 */
adminRoutes.get('/api-usage', async (c) => {
  try {
    const geckoService = createGeckoTerminalService(c.env);
    const stats = await geckoService.getUsageStats();

    // Calculate percentages and warnings
    const maxCreditsPerMonth = 480000; // 500k with buffer
    const maxRequestsPerMin = 450; // 500 with buffer

    const creditsPercent = ((stats.credits.count / maxCreditsPerMonth) * 100).toFixed(2);
    const requestsPercent = ((stats.rateLimit.requestCount / maxRequestsPerMin) * 100).toFixed(2);

    // Calculate time until rate limit window resets
    const rateLimitWindowMs = 60 * 1000; // 1 minute
    const rateLimitResetMs = stats.rateLimit.windowStart + rateLimitWindowMs - Date.now();
    const rateLimitResetSec = Math.max(0, Math.ceil(rateLimitResetMs / 1000));

    return c.json({
      credits: {
        used: stats.credits.count,
        limit: maxCreditsPerMonth,
        hardLimit: 500000,
        percent: creditsPercent,
        month: stats.credits.month,
        status: stats.credits.count >= maxCreditsPerMonth ? 'EXCEEDED' : stats.credits.count >= maxCreditsPerMonth * 0.9 ? 'WARNING' : 'OK',
      },
      rateLimit: {
        current: stats.rateLimit.requestCount,
        limit: maxRequestsPerMin,
        hardLimit: 500,
        percent: requestsPercent,
        resetsIn: `${rateLimitResetSec}s`,
        status: stats.rateLimit.requestCount >= maxRequestsPerMin ? 'EXCEEDED' : stats.rateLimit.requestCount >= maxRequestsPerMin * 0.9 ? 'WARNING' : 'OK',
      },
      warnings: [
        ...(stats.credits.count >= maxCreditsPerMonth * 0.9 ? [`High credit usage: ${creditsPercent}%`] : []),
        ...(stats.rateLimit.requestCount >= maxRequestsPerMin * 0.9 ? [`High rate limit usage: ${requestsPercent}%`] : []),
      ],
    });
  } catch (error) {
    console.error('Error fetching API usage stats:', error);
    return c.json({ error: 'Failed to fetch API usage stats' }, 500);
  }
});
