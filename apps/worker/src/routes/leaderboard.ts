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
      'SELECT * FROM matches WHERE status IN (?, ?) ORDER BY start_ts DESC LIMIT 1'
    )
      .bind('running', 'pending')
      .first();

    if (!match) {
      return c.json({ error: 'No active match' }, 404);
    }

    // Get all bots in this match
    const bots = await c.env.DB.prepare(
      'SELECT id, owner_address, bot_name, bot_description, prompt_raw FROM bots WHERE match_id = ? ORDER BY created_at ASC'
    )
      .bind(match.id)
      .all();

    // Try to get live data from Durable Object
    let liveData: any[] = [];

    if (match.status === 'running') {
      try {
        const id = c.env.MATCH_COORDINATOR.idFromName(`match-${match.id}`);
        const stub = c.env.MATCH_COORDINATOR.get(id);
        const response = await stub.fetch('https://match/leaderboard');

        console.log('DO response status:', response.status);
        const data = await response.json();
        console.log('DO leaderboard data:', JSON.stringify(data));

        if (Array.isArray(data)) {
          liveData = data;
          console.log('Using live data from DO, entries:', liveData.length);
        } else if (data.error) {
          console.error('DO returned error:', data.error);
        }
      } catch (error) {
        console.error('Failed to fetch from DO:', error);
        // Continue with static bot list
      }
    }

    // Build leaderboard
    const leaderboard = (bots.results || []).map((bot: any) => {
      const liveEntry = liveData.find((entry: any) => entry.bot_id === bot.id);

      return {
        botId: bot.id,
        ownerAddress: bot.owner_address,
        botName: bot.bot_name || bot.prompt_raw?.substring(0, 50) || 'Unknown',
        botDescription: bot.bot_description,
        balance: liveEntry?.balance || 1.0,
        pnl: liveEntry?.gain_pct || 0,
        orders: liveEntry?.trades || 0,
        scans: liveEntry?.scans || 0,
        status: liveEntry ? 'trading' : 'waiting',
      };
    });

    return c.json({
      matchId: match.id,
      matchStatus: match.status,
      leaderboard: leaderboard.sort((a: any, b: any) => b.balance - a.balance),
    });
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

    // Get final results from winners table with bot names
    const winnersResult = await c.env.DB.prepare(
      `SELECT
        w.*,
        b.bot_name,
        b.bot_description
      FROM winners w
      LEFT JOIN bots b ON w.bot_id = b.id
      WHERE w.match_id = ?
      ORDER BY w.end_balance DESC`
    )
      .bind(matchId)
      .all();

    const winners = (winnersResult.results || []).map((w: any) => ({
      ...w,
      gain_pct: w.pct_gain, // Map pct_gain to gain_pct for frontend
    }));

    // Calculate total prize pool
    const totalPrize = winners.reduce((sum: number, w: any) => sum + (w.prize_bnb || 0), 0);

    return c.json({
      match: {
        id: match.id,
        status: match.status,
        result_hash: match.result_hash,
        start_ts: match.start_ts,
        end_ts: match.end_ts,
        prize_bnb: totalPrize,
      },
      winners,
    });
  } catch (error) {
    console.error('Error fetching final results:', error);
    return c.json({ error: 'Failed to fetch results' }, 500);
  }
});
