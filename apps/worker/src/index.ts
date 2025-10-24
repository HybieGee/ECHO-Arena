/**
 * ECHO Arena Worker - Main entry point
 * Hono-based API with routes for bot management, match coordination, and admin
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Import routes
import { configRoute } from './routes/config';
import { authRoutes } from './routes/auth';
import { burnRoutes } from './routes/burn';
import { botRoutes } from './routes/bot';
import { matchRoutes } from './routes/match';
import { leaderboardRoutes } from './routes/leaderboard';
import { adminRoutes } from './routes/admin';

// Export Durable Object
export { MatchCoordinator } from './durable-objects/match-coordinator';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: '*', // In production, restrict to your domain
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'ECHO Arena API',
    version: '1.0.0',
  });
});

// Mount routes
app.route('/api/config', configRoute);
app.route('/api/auth', authRoutes);
app.route('/api/burn', burnRoutes);
app.route('/api/bot', botRoutes);
app.route('/api/match', matchRoutes);
app.route('/api/leaderboard', leaderboardRoutes);
app.route('/api/admin', adminRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
  }, 500);
});

export default app;
