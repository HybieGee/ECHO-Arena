/**
 * Leaderboard routes
 * Get live leaderboard data
 */

import { Hono } from 'hono';
import type { Env } from '../types';

export const leaderboardRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/leaderboard
 * Get current leaderboard
 */
leaderboardRoutes.get('/', async (c) => {
  try {
    // Get current match
    const match = await c.env.DB.prepare(
      'SELECT * FROM matches WHERE status = ? ORDER BY start_ts DESC LIMIT 1'
    )
      .bind('running')
      .first();

    if (!match) {
      return c.json({ error: 'No running match' }, 404);
    }

    // Get Durable Object stub
    const id = c.env.MATCH_COORDINATOR.idFromName(`match-${match.id}`);
    const stub = c.env.MATCH_COORDINATOR.get(id);

    // Fetch leaderboard from DO
    const response = await stub.fetch('https://match/leaderboard');
    const leaderboard = await response.json();

    // Enrich with bot data
    if (Array.isArray(leaderboard)) {
      const enriched = await Promise.all(
        leaderboard.map(async (entry: any) => {
          const bot = await c.env.DB.prepare(
            'SELECT prompt_raw FROM bots WHERE id = ?'
          )
            .bind(entry.bot_id)
            .first();

          return {
            ...entry,
            botName: bot?.prompt_raw.substring(0, 16) || 'Unknown',
          };
        })
      );

      return c.json({
        matchId: match.id,
        leaderboard: enriched,
      });
    }

    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

/**
 * GET /api/leaderboard/:matchId
 * Get final results for a settled match
 */
leaderboardRoutes.get('/:matchId', async (c) => {
  try {
    const matchId = c.req.param('matchId');

    // Get match
    const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
      .bind(matchId)
      .first();

    if (!match) {
      return c.json({ error: 'Match not found' }, 404);
    }

    if (match.status !== 'settled') {
      return c.json({ error: 'Match not yet settled' }, 400);
    }

    // Get final results from winners table
    const winners = await c.env.DB.prepare(
      'SELECT * FROM winners WHERE match_id = ? ORDER BY end_balance DESC'
    )
      .bind(matchId)
      .all();

    return c.json({
      matchId: match.id,
      status: match.status,
      resultHash: match.result_hash,
      winners: winners.results || [],
    });
  } catch (error) {
    console.error('Error fetching final results:', error);
    return c.json({ error: 'Failed to fetch results' }, 500);
  }
});
