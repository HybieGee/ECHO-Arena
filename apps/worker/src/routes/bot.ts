/**
 * Bot management routes
 * Create and retrieve bots
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { parsePromptToDSL } from '@echo-arena/dsl';
import { checkFreeEligibility } from '../lib/free-week';
import { rateLimitMiddleware } from '../lib/rate-limit';

export const botRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/bot
 * Create a new bot
 */
botRoutes.post('/', async (c) => {
  try {
    const { prompt, address } = await c.req.json();

    if (!prompt || !address) {
      return c.json({ error: 'Missing prompt or address' }, 400);
    }

    // Rate limiting
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown';
    const rateLimit = await rateLimitMiddleware(c.env.RATE_LIMIT, `bot:${clientIP}`);

    if (!rateLimit.allowed) {
      return c.json(
        { error: 'Rate limit exceeded. Try again later.' },
        429,
        rateLimit.headers
      );
    }

    // Get current match
    const match = await c.env.DB.prepare(
      'SELECT * FROM matches WHERE status IN (?, ?) ORDER BY start_ts DESC LIMIT 1'
    )
      .bind('pending', 'running')
      .first();

    if (!match) {
      return c.json({ error: 'No active match available' }, 400, rateLimit.headers);
    }

    // Check if user already has a bot in this match
    const existingBot = await c.env.DB.prepare(
      'SELECT id FROM bots WHERE match_id = ? AND owner_address = ? LIMIT 1'
    )
      .bind(match.id, address.toLowerCase())
      .first();

    if (existingBot) {
      return c.json(
        { error: 'You already have a bot in this match' },
        400,
        rateLimit.headers
      );
    }

    // Check eligibility
    const freeCheck = await checkFreeEligibility(
      c.env.DB,
      address,
      c.env.FREE_START,
      c.env.FREE_END
    );

    if (!freeCheck.eligible) {
      // Check for verified burn
      const burn = await c.env.DB.prepare(
        'SELECT id FROM burns WHERE owner_address = ? AND verified = 1 AND ts >= ?'
      )
        .bind(address.toLowerCase(), match.start_ts)
        .first();

      if (!burn) {
        return c.json(
          {
            error: 'Entry requires burn. No verified burn found.',
            requiresBurn: true,
          },
          402,
          rateLimit.headers
        );
      }
    }

    // Parse prompt to DSL
    const parseResult = await parsePromptToDSL(prompt);

    if (!parseResult.success || !parseResult.dsl) {
      return c.json(
        { error: parseResult.error || 'Failed to parse strategy' },
        400,
        rateLimit.headers
      );
    }

    // Insert bot
    const botResult = await c.env.DB.prepare(
      'INSERT INTO bots (match_id, owner_address, prompt_raw, prompt_dsl, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *'
    )
      .bind(
        match.id,
        address.toLowerCase(),
        prompt,
        JSON.stringify(parseResult.dsl),
        Math.floor(Date.now() / 1000)
      )
      .first();

    if (!botResult) {
      return c.json({ error: 'Failed to create bot' }, 500, rateLimit.headers);
    }

    return c.json(
      {
        success: true,
        bot: {
          id: botResult.id,
          matchId: botResult.match_id,
          prompt: botResult.prompt_raw,
          dsl: JSON.parse(botResult.prompt_dsl),
        },
      },
      201,
      rateLimit.headers
    );
  } catch (error) {
    console.error('Bot creation error:', error);
    return c.json({ error: 'Failed to create bot' }, 500);
  }
});

/**
 * GET /api/bot/:id
 * Get bot details
 */
botRoutes.get('/:id', async (c) => {
  try {
    const botId = c.req.param('id');

    const bot = await c.env.DB.prepare('SELECT * FROM bots WHERE id = ?')
      .bind(botId)
      .first();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    // Get orders
    const orders = await c.env.DB.prepare(
      'SELECT * FROM orders WHERE bot_id = ? ORDER BY ts DESC'
    )
      .bind(botId)
      .all();

    // Get balances
    const balances = await c.env.DB.prepare(
      'SELECT * FROM balances WHERE bot_id = ? ORDER BY ts DESC LIMIT 100'
    )
      .bind(botId)
      .all();

    return c.json({
      bot: {
        id: bot.id,
        matchId: bot.match_id,
        ownerAddress: bot.owner_address,
        prompt: bot.prompt_raw,
        dsl: JSON.parse(bot.prompt_dsl),
        createdAt: bot.created_at,
      },
      orders: orders.results || [],
      balances: balances.results || [],
    });
  } catch (error) {
    console.error('Error fetching bot:', error);
    return c.json({ error: 'Failed to fetch bot' }, 500);
  }
});
