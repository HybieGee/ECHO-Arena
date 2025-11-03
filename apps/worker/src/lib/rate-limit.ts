/**
 * Rate limiting utilities using KV
 * Token bucket algorithm
 */

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 5,
  refillRate: 5 / 3600, // 5 tokens per hour
  windowMs: 3600000, // 1 hour
};

interface BucketState {
  tokens: number;
  lastRefill: number;
}

/**
 * Check rate limit and consume a token if available
 */
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  // Get current bucket state
  const stateJson = await kv.get(key);
  let state: BucketState;

  if (stateJson) {
    state = JSON.parse(stateJson);

    // Refill tokens based on time elapsed
    const timeSinceLastRefill = now - state.lastRefill;
    const tokensToAdd = (timeSinceLastRefill / 1000) * config.refillRate;
    state.tokens = Math.min(config.maxTokens, state.tokens + tokensToAdd);
    state.lastRefill = now;
  } else {
    // Initialize new bucket
    state = {
      tokens: config.maxTokens,
      lastRefill: now,
    };
  }

  // Check if we have tokens available
  const allowed = state.tokens >= 1;

  if (allowed) {
    state.tokens -= 1;
  }

  // Calculate when the bucket will have tokens again
  const resetAt = now + ((1 - state.tokens % 1) / config.refillRate) * 1000;

  // Store updated state
  // Ensure TTL is at least 60 seconds (KV minimum requirement)
  await kv.put(key, JSON.stringify(state), {
    expirationTtl: Math.max(60, Math.ceil(config.windowMs / 1000)),
  });

  return {
    allowed,
    remaining: Math.floor(state.tokens),
    resetAt: Math.ceil(resetAt / 1000),
  };
}

/**
 * Middleware to apply rate limiting
 */
export async function rateLimitMiddleware(
  kv: KVNamespace,
  identifier: string
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const result = await checkRateLimit(kv, identifier);

  const headers = {
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };

  return {
    allowed: result.allowed,
    headers,
  };
}
