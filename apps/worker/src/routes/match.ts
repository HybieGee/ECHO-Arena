/**
 * Match routes
 * Get current match information
 */

import { Hono } from 'hono';
import type { Env } from '../types';

export const matchRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/match/current
 * Get current active match
 */
matchRoutes.get('/current', async (c) => {
  try {
    const match = await c.env.DB.prepare(
      'SELECT * FROM matches WHERE status IN (?, ?) ORDER BY start_ts DESC LIMIT 1'
    )
      .bind('pending', 'running')
      .first();

    if (!match) {
      return c.json({ error: 'No active match' }, 404);
    }

    // Get bot count
    const botCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM bots WHERE match_id = ?'
    )
      .bind(match.id)
      .first();

    // Get total burns
    const burns = await c.env.DB.prepare(
      'SELECT SUM(amount_echo) as total, SUM(amount_bnb_equiv) as total_bnb FROM burns WHERE ts >= ? AND verified = 1'
    )
      .bind(match.start_ts)
      .first();

    const now = Date.now();
    const startTs = match.start_ts * 1000;
    const endTs = match.end_ts * 1000;
    const timeRemaining = Math.max(0, endTs - now);

    return c.json({
      match: {
        id: match.id,
        status: match.status,
        startTs: match.start_ts,
        endTs: match.end_ts,
        timeRemaining,
        botsEntered: botCount?.count || 0,
        totalBurnsEcho: burns?.total || 0,
        totalBurnsBNB: burns?.total_bnb || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    return c.json({ error: 'Failed to fetch match' }, 500);
  }
});

/**
 * GET /api/match/history
 * Get balance history for current match
 */
matchRoutes.get('/history', async (c) => {
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

    // Get history from Durable Object
    try {
      const id = c.env.MATCH_COORDINATOR.idFromName(`match-${match.id}`);
      const stub = c.env.MATCH_COORDINATOR.get(id);
      const response = await stub.fetch('https://match/history');

      if (!response.ok) {
        console.error('DO history response not ok:', response.status);
        return c.json({ balanceHistory: [] });
      }

      const data = await response.json();
      return c.json(data);
    } catch (error) {
      console.error('Failed to fetch history from DO:', error);
      return c.json({ balanceHistory: [] });
    }
  } catch (error) {
    console.error('Error fetching match history:', error);
    return c.json({ error: 'Failed to fetch history' }, 500);
  }
});

/**
 * GET /api/match/:id
 * Get specific match details
 */
matchRoutes.get('/:id', async (c) => {
  try {
    const matchId = c.req.param('id');

    const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
      .bind(matchId)
      .first();

    if (!match) {
      return c.json({ error: 'Match not found' }, 404);
    }

    // Get bots
    const bots = await c.env.DB.prepare(
      'SELECT id, owner_address, prompt_raw, created_at FROM bots WHERE match_id = ?'
    )
      .bind(matchId)
      .all();

    return c.json({
      match: {
        id: match.id,
        status: match.status,
        startTs: match.start_ts,
        endTs: match.end_ts,
        resultHash: match.result_hash,
        botsCount: bots.results?.length || 0,
      },
      bots: bots.results || [],
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    return c.json({ error: 'Failed to fetch match' }, 500);
  }
});

/**
 * GET /api/match/bnb-price
 * Get current BNB price in USD
 */
matchRoutes.get('/bnb-price', async (c) => {
  try {
    // Get BNB price from cache (updated by GeckoTerminal service)
    const cached = await c.env.RESULTS.get('bnb_price_usd');

    if (cached) {
      const data = JSON.parse(cached);
      return c.json({
        price: data.price,
        timestamp: data.timestamp,
        source: 'GeckoTerminal'
      });
    }

    // Fallback if no cached price
    return c.json({
      price: 600,
      timestamp: Date.now(),
      source: 'fallback'
    });
  } catch (error) {
    console.error('Error fetching BNB price:', error);
    return c.json({
      price: 600,
      timestamp: Date.now(),
      source: 'fallback'
    });
  }
});
