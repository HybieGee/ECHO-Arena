/**
 * Burn verification routes
 * Handles $ECHO token burn verification
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { fetchEchoPrice } from '../lib/dexscreener';
import {
  verifyBurnTransaction,
  checkDuplicateBurn,
  recordBurn,
} from '../lib/burn-verifier';
import { rateLimitMiddleware } from '../lib/rate-limit';

export const burnRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/burn/price
 * Get current $ECHO price in BNB and required burn amount
 */
burnRoutes.get('/price', async (c) => {
  try {
    const echoTokenAddress = c.env.ECHO_TOKEN_ADDRESS;

    // Fetch current ECHO price in BNB
    const priceInBNB = await fetchEchoPrice(echoTokenAddress);

    // Calculate required $ECHO amount for 0.01 BNB burn
    // Add 0.5% buffer to account for price movement
    const requiredEcho = Math.ceil((0.01 / priceInBNB) * 1.005);

    return c.json({
      priceInBNB,
      requiredBurnBNB: 0.01,
      requiredEchoAmount: requiredEcho,
      buffer: 0.005,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching burn price:', error);
    return c.json({ error: 'Failed to fetch price' }, 500);
  }
});

/**
 * POST /api/burn/verify
 * Verify a burn transaction
 */
burnRoutes.post('/verify', async (c) => {
  try {
    const { txHash, address } = await c.req.json();

    if (!txHash || !address) {
      return c.json({ error: 'Missing txHash or address' }, 400);
    }

    // Rate limiting by IP
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown';
    const rateLimit = await rateLimitMiddleware(c.env.RATE_LIMIT, `burn:${clientIP}`);

    if (!rateLimit.allowed) {
      return c.json(
        { error: 'Rate limit exceeded. Try again later.' },
        429,
        rateLimit.headers
      );
    }

    // Check for duplicate
    const isDuplicate = await checkDuplicateBurn(c.env.DB, txHash);
    if (isDuplicate) {
      return c.json({ error: 'Transaction already used' }, 400, rateLimit.headers);
    }

    // Get required amount
    const echoTokenAddress = c.env.ECHO_TOKEN_ADDRESS;
    const priceInBNB = await fetchEchoPrice(echoTokenAddress);
    const requiredEcho = (0.01 / priceInBNB) * 1.005;

    // Convert to wei (18 decimals for most tokens)
    const requiredWei = BigInt(Math.floor(requiredEcho * 1e18));

    // Verify the burn transaction
    const verification = await verifyBurnTransaction(
      c.env.BSC_RPC_URL,
      txHash as `0x${string}`,
      address as `0x${string}`,
      echoTokenAddress as `0x${string}`,
      requiredWei
    );

    if (!verification.valid) {
      return c.json(
        { error: verification.error || 'Burn verification failed' },
        400,
        rateLimit.headers
      );
    }

    // Record the burn
    const amountEcho = verification.amount
      ? (Number(verification.amount) / 1e18).toString()
      : requiredEcho.toString();

    const recorded = await recordBurn(
      c.env.DB,
      address,
      txHash,
      amountEcho,
      0.01
    );

    if (!recorded) {
      return c.json({ error: 'Failed to record burn' }, 500, rateLimit.headers);
    }

    return c.json(
      {
        success: true,
        verified: true,
        amount: amountEcho,
        txHash,
      },
      200,
      rateLimit.headers
    );
  } catch (error) {
    console.error('Burn verification error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

/**
 * GET /api/burn/check/:address
 * Check if address has a verified burn for current match
 */
burnRoutes.get('/check/:address', async (c) => {
  try {
    const address = c.req.param('address');

    // Get current match
    const match = await c.env.DB.prepare(
      'SELECT id, start_ts FROM matches WHERE status IN (?, ?) ORDER BY start_ts DESC LIMIT 1'
    )
      .bind('running', 'pending')
      .first();

    if (!match) {
      return c.json({ hasVerifiedBurn: false });
    }

    // Check for verified burn
    const burn = await c.env.DB.prepare(
      'SELECT id FROM burns WHERE owner_address = ? AND verified = 1 AND ts >= ?'
    )
      .bind(address.toLowerCase(), match.start_ts)
      .first();

    return c.json({
      hasVerifiedBurn: burn !== null,
      matchId: match.id,
    });
  } catch (error) {
    console.error('Error checking burn:', error);
    return c.json({ error: 'Failed to check burn status' }, 500);
  }
});
