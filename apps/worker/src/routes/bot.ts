/**
 * Bot management routes
 * Create and retrieve bots
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { parsePromptToDSL } from '@echo-arena/dsl';
import { checkFreeEligibility } from '../lib/free-week';
import { rateLimitMiddleware } from '../lib/rate-limit';

/**
 * Simple hash function for creating uniqueness seeds
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export const botRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/bot/preview
 * Preview a bot strategy (parse DSL without creating)
 */
botRoutes.post('/preview', async (c) => {
  try {
    const { prompt } = await c.req.json();

    if (!prompt) {
      return c.json({ error: 'Missing prompt' }, 400);
    }

    // Parse prompt to DSL (with Claude API fallback)
    // Use timestamp as uniqueness seed for preview
    const uniquenessSeed = Date.now();
    const parseResult = await parsePromptToDSL(prompt, c.env.ANTHROPIC_API_KEY, uniquenessSeed);

    if (!parseResult.success || !parseResult.dsl) {
      return c.json(
        { error: parseResult.error || 'Failed to parse strategy' },
        400
      );
    }

    return c.json({
      success: true,
      dsl: parseResult.dsl,
      usedLLM: parseResult.usedLLM,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return c.json({ error: 'Failed to preview strategy' }, 500);
  }
});

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

    // Skip restrictions in development mode for testing
    const isDevelopment = c.env.ENVIRONMENT === 'development';

    // Check if user already has a bot in this match
    const existingBot = await c.env.DB.prepare(
      'SELECT id FROM bots WHERE match_id = ? AND owner_address = ? LIMIT 1'
    )
      .bind(match.id, address.toLowerCase())
      .first();

    if (existingBot) {
      if (isDevelopment) {
        // In development mode, delete existing bot to allow testing
        await c.env.DB.prepare('DELETE FROM bots WHERE id = ?')
          .bind(existingBot.id)
          .run();
      } else {
        return c.json(
          { error: 'You already have a bot in this match' },
          400,
          rateLimit.headers
        );
      }
    }

    // Check eligibility

    if (!isDevelopment) {
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
    }

    // Parse prompt to DSL (with Claude API fallback)
    // Use timestamp + address hash for maximum uniqueness
    const uniquenessSeed = Date.now() + hashCode(address);
    const parseResult = await parsePromptToDSL(prompt, c.env.ANTHROPIC_API_KEY, uniquenessSeed);

    if (!parseResult.success || !parseResult.dsl) {
      return c.json(
        { error: parseResult.error || 'Failed to parse strategy' },
        400,
        rateLimit.headers
      );
    }

    // Generate bot name and description using Claude
    let botName = 'Trading Bot';
    let botDescription = prompt.substring(0, 100);

    if (c.env.ANTHROPIC_API_KEY) {
      try {
        const nameResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': c.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: `You are a creative bot naming expert. Create a COOL, MEMORABLE trading bot name for this strategy:

"${prompt}"

Requirements:
- Name must be 2-4 words max
- Must sound like a professional trading bot (e.g., "Alpha Hunter", "Momentum Rider", "Volume Sniper")
- NO generic words like "Bot" or "Trader" in the name
- Make it catchy and memorable
- Also create a 1-sentence description (max 100 chars)

Respond EXACTLY in this format:
NAME: [your creative bot name here]
DESC: [one sentence description]

Example:
NAME: Lightning Scalper
DESC: Aggressive high-frequency bot targeting quick momentum plays with tight stops`
            }]
          }),
        });

        if (nameResponse.ok) {
          const data = await nameResponse.json() as { content?: Array<{ text?: string }> };
          const text = data.content?.[0]?.text || '';
          console.log('Claude name generation response:', text);

          const nameMatch = text.match(/NAME:\s*(.+?)(?:\n|$)/);
          const descMatch = text.match(/DESC:\s*(.+?)(?:\n|$)/);

          if (nameMatch) {
            botName = nameMatch[1].trim().substring(0, 50);
            console.log('Generated bot name:', botName);
          }
          if (descMatch) {
            botDescription = descMatch[1].trim().substring(0, 100);
            console.log('Generated bot description:', botDescription);
          }
        } else {
          console.error('Claude API error:', nameResponse.status, await nameResponse.text());
        }
      } catch (error) {
        console.error('Failed to generate bot name/description:', error);
        // Use defaults if generation fails
      }
    }

    // Insert bot
    const botResult = await c.env.DB.prepare(
      'INSERT INTO bots (match_id, owner_address, prompt_raw, prompt_dsl, bot_name, bot_description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *'
    )
      .bind(
        match.id,
        address.toLowerCase(),
        prompt,
        JSON.stringify(parseResult.dsl),
        botName,
        botDescription,
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
          name: botResult.bot_name,
          description: botResult.bot_description,
          prompt: botResult.prompt_raw,
          dsl: JSON.parse(botResult.prompt_dsl),
        },
      },
      201,
      rateLimit.headers
    );
  } catch (error) {
    console.error('Bot creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create bot';
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * GET /api/bot/check-eligibility/:address
 * Check if address is eligible for free spawn
 */
botRoutes.get('/check-eligibility/:address', async (c) => {
  try {
    const address = c.req.param('address');

    // In development mode, always allow free spawns for testing
    const isDevelopment = c.env.ENVIRONMENT === 'development';

    if (isDevelopment) {
      return c.json({
        eligible: true,
        reason: 'Development mode - unlimited free spawns',
        isFreeWeek: true,
      });
    }

    const freeCheck = await checkFreeEligibility(
      c.env.DB,
      address,
      c.env.FREE_START,
      c.env.FREE_END
    );

    return c.json({
      eligible: freeCheck.eligible,
      reason: freeCheck.reason,
      isFreeWeek: freeCheck.eligible || freeCheck.reason === 'Free spawn already used',
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return c.json({ error: 'Failed to check eligibility' }, 500);
  }
});

/**
 * GET /api/bot/by-owner/:address
 * Get all bots for a specific owner address
 */
botRoutes.get('/by-owner/:address', async (c) => {
  try {
    const address = c.req.param('address').toLowerCase();

    // Get all bots for this owner with match info
    const bots = await c.env.DB.prepare(
      `SELECT
        bots.*,
        matches.status as match_status,
        matches.start_ts,
        matches.end_ts
      FROM bots
      LEFT JOIN matches ON bots.match_id = matches.id
      WHERE bots.owner_address = ?
      ORDER BY bots.created_at DESC`
    )
      .bind(address)
      .all();

    const botList = (bots.results || []).map((bot: any) => ({
      id: bot.id,
      matchId: bot.match_id,
      matchStatus: bot.match_status,
      name: bot.bot_name,
      description: bot.bot_description,
      prompt: bot.prompt_raw,
      createdAt: bot.created_at,
      matchStartTs: bot.start_ts,
      matchEndTs: bot.end_ts,
    }));

    return c.json({
      bots: botList,
      count: botList.length,
    });
  } catch (error) {
    console.error('Error fetching bots by owner:', error);
    return c.json({ error: 'Failed to fetch bots' }, 500);
  }
});

/**
 * GET /api/bot/:id
 * Get bot details with live trading data
 */
botRoutes.get('/:id', async (c) => {
  try {
    const botId = parseInt(c.req.param('id'));

    const bot = await c.env.DB.prepare('SELECT * FROM bots WHERE id = ?')
      .bind(botId)
      .first();

    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }

    // Get match info to check if it's running
    const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
      .bind(bot.match_id)
      .first();

    // Try to get live data from Durable Object if match is running
    let liveData: any = null;

    if (match && match.status === 'running') {
      try {
        const id = c.env.MATCH_COORDINATOR.idFromName(`match-${match.id}`);
        const stub = c.env.MATCH_COORDINATOR.get(id);
        const response = await stub.fetch(`https://match/bot/${botId}`);

        if (response.ok) {
          liveData = await response.json();
          console.log('Live bot data from DO:', JSON.stringify(liveData));
        } else {
          console.error('DO bot details fetch failed:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch bot details from DO:', error);
        // Continue with static D1 data
      }
    }

    // If we have live data, use it
    if (liveData && !liveData.error) {
      return c.json({
        bot: {
          id: bot.id,
          matchId: bot.match_id,
          ownerAddress: bot.owner_address,
          name: bot.bot_name,
          description: bot.bot_description,
          prompt: bot.prompt_raw,
          dsl: JSON.parse(bot.prompt_dsl),
          createdAt: bot.created_at,
        },
        balance: liveData.balance,
        positions: liveData.positions || [],
        orders: liveData.orders || [],
        stats: liveData.stats || {},
      });
    }

    // Fallback to D1 data for settled matches
    const orders = await c.env.DB.prepare(
      'SELECT * FROM orders WHERE bot_id = ? ORDER BY ts DESC LIMIT 50'
    )
      .bind(botId)
      .all();

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
        name: bot.bot_name,
        description: bot.bot_description,
        prompt: bot.prompt_raw,
        dsl: JSON.parse(bot.prompt_dsl),
        createdAt: bot.created_at,
      },
      balance: balances.results?.[0]?.bnb_balance || 1.0,
      positions: [],
      orders: orders.results || [],
      stats: {
        totalOrders: orders.results?.length || 0,
        totalScans: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching bot:', error);
    return c.json({ error: 'Failed to fetch bot' }, 500);
  }
});
