/**
 * Authentication routes
 * EIP-191 signature-based authentication
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import {
  generateNonce,
  createChallengeMessage,
  storeNonce,
  verifySignature,
  verifyAndConsumeNonce,
} from '../lib/auth';

export const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/nonce
 * Generate a nonce for authentication challenge
 */
authRoutes.post('/nonce', async (c) => {
  try {
    const { address } = await c.req.json();

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ error: 'Invalid address' }, 400);
    }

    const nonce = generateNonce();
    const message = createChallengeMessage(nonce, address);

    // Store nonce in CACHE KV
    await storeNonce(c.env.CACHE, address, nonce);

    return c.json({
      nonce,
      message,
      expiresIn: 300, // 5 minutes
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return c.json({ error: 'Failed to generate nonce' }, 500);
  }
});

/**
 * POST /api/auth/verify
 * Verify signature and create/get user
 */
authRoutes.post('/verify', async (c) => {
  try {
    const { address, signature, nonce } = await c.req.json();

    if (!address || !signature || !nonce) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify nonce
    const nonceValid = await verifyAndConsumeNonce(c.env.CACHE, address, nonce);
    if (!nonceValid) {
      return c.json({ error: 'Invalid or expired nonce' }, 401);
    }

    // Verify signature
    const message = createChallengeMessage(nonce, address);
    const isValid = await verifySignature(message, signature, address);

    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Create or get user from DB
    const userResult = await c.env.DB.prepare(
      'INSERT INTO users (address) VALUES (?) ON CONFLICT(address) DO UPDATE SET address = address RETURNING *'
    )
      .bind(address.toLowerCase())
      .first();

    if (!userResult) {
      return c.json({ error: 'Failed to create user' }, 500);
    }

    return c.json({
      success: true,
      user: {
        id: userResult.id,
        address: userResult.address,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});
