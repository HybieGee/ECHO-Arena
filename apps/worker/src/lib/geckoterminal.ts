/**
 * GeckoTerminal API integration with rate limiting and credit tracking
 *
 * Plan Limits:
 * - 500k credits/month (1 call = 1 credit)
 * - 500 requests/minute
 * - Overage: $250 per 500k calls
 *
 * Strategy:
 * - Aggressive caching (30-60s TTL) to minimize calls
 * - Rate limiting to stay under 500 req/min
 * - Credit tracking to monitor usage
 * - Fallback to cached data if limits exceeded
 */

import type { Token } from '@echo-arena/sim';

const GECKOTERMINAL_API = 'https://api.geckoterminal.com/api/v2';
const BSC_NETWORK = 'bsc';

// Rate limiting constants
const MAX_REQUESTS_PER_MINUTE = 450; // Buffer below 500 limit
const MAX_CREDITS_PER_MONTH = 480000; // Buffer below 500k limit

// Cache TTL in seconds
// CRITICAL: This cache is GLOBAL across ALL matches and users via KV
// With 1000+ concurrent users, longer TTL is essential to stay under 500k/month
const CACHE_TTL_SECONDS = 90; // 90 seconds - reduces API calls by 50%

interface GeckoTerminalPool {
  id: string;
  type: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    base_token_price_native_currency: string;
    quote_token_price_usd: string;
    pool_created_at: string;
    reserve_in_usd: string;
    volume_usd: {
      h24: string;
    };
    price_change_percentage: {
      h24: string;
    };
  };
  relationships: {
    base_token: {
      data: {
        id: string;
        type: string;
      };
    };
    quote_token: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

interface GeckoTerminalToken {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    symbol: string;
  };
}

interface CachedTokens {
  tokens: Token[];
  timestamp: number;
  cacheKey: string;
}

interface RateLimitState {
  requestCount: number;
  windowStart: number; // Unix timestamp in ms
}

interface CreditUsage {
  count: number;
  month: string; // Format: "YYYY-MM"
}

interface InFlightRequest {
  timestamp: number;
  promise: Promise<Token[]> | null;
}

export class GeckoTerminalService {
  private env: Env;
  private cache: KVNamespace;

  constructor(env: Env) {
    this.env = env;
    this.cache = env.RESULTS; // Reuse RESULTS KV for caching (GLOBAL across all requests)
  }

  /**
   * Fetch BSC tokens with rate limiting and caching
   *
   * IMPORTANT: This cache is GLOBAL via Cloudflare KV
   * - All users share the same cache
   * - All matches share the same cache
   * - Dramatically reduces API calls with high traffic
   *
   * @param skipCache - If true, always fetch fresh data (for simulation ticks)
   */
  async fetchBSCTokens(skipCache = false): Promise<Token[]> {
    try {
      // For simulation ticks: skip cache and get fresh data
      // For user/leaderboard views: use cache
      if (skipCache) {
        console.log('🔄 Simulation tick: Fetching FRESH prices (cache skipped)');
      } else {
        // Check cache first (GLOBAL - shared by all users/matches)
        const cached = await this.getCachedTokens();
        if (cached) {
          console.log('✅ Using GLOBAL cached tokens (age: ' + Math.floor((Date.now() - cached.timestamp) / 1000) + 's)');
          return cached.tokens;
        }
      }

      // Check if another request is already fetching (request coalescing)
      const inFlight = await this.getInFlightRequest();
      if (inFlight) {
        console.log('⏳ Another request is fetching, waiting for result...');
        // Wait a bit and check cache again (the other request should populate it)
        await new Promise(resolve => setTimeout(resolve, 1000));
        const nowCached = await this.getCachedTokens();
        if (nowCached) {
          return nowCached.tokens;
        }
      }

      // Mark request as in-flight to prevent concurrent API calls
      await this.markInFlight();

      // Check rate limit before making API call
      const rateLimitOk = await this.checkRateLimit();
      if (!rateLimitOk) {
        await this.clearInFlight();
        console.warn('⚠️ Rate limit exceeded (450/min), using stale cache');
        return await this.getStaleCache() || this.getFallbackTokens();
      }

      // Check credit usage before making API call
      const creditsOk = await this.checkCreditLimit();
      if (!creditsOk) {
        await this.clearInFlight();
        console.error('❌ Monthly credit limit exceeded (480k/month), using stale cache');
        return await this.getStaleCache() || this.getFallbackTokens();
      }

      // Make API call
      console.log('🌐 Fetching fresh data from GeckoTerminal API...');
      const tokens = await this.fetchFromAPI();

      // Increment usage counters
      await this.incrementRateLimit();
      await this.incrementCredits();

      // Cache the result (GLOBAL)
      await this.cacheTokens(tokens);

      // Clear in-flight marker
      await this.clearInFlight();

      return tokens;
    } catch (error) {
      console.error('Error in fetchBSCTokens:', error);
      await this.clearInFlight();
      // Return stale cache or fallback
      return await this.getStaleCache() || this.getFallbackTokens();
    }
  }

  /**
   * Fetch tokens from GeckoTerminal API
   */
  private async fetchFromAPI(): Promise<Token[]> {
    // Fetch trending pools on BSC with BNB as quote token
    const url = `${GECKOTERMINAL_API}/networks/${BSC_NETWORK}/trending_pools?page=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-CG-PRO-API-KEY': this.env.COINGECKO_API_KEY || '', // Optional: add API key if using paid plan
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GeckoTerminal API error (${response.status}):`, errorText.substring(0, 500));
      throw new Error(`GeckoTerminal API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid GeckoTerminal response format');
      throw new Error('Invalid API response format');
    }

    const pools: GeckoTerminalPool[] = data.data;

    console.log(`Received ${pools.length} pools from GeckoTerminal`);

    // Transform to Token format
    const tokens: Token[] = [];

    // Extract BNB price from first pool's quote token (WBNB)
    let bnbPriceUSD = 600; // Fallback
    if (pools.length > 0 && pools[0].attributes.quote_token_price_usd) {
      bnbPriceUSD = parseFloat(pools[0].attributes.quote_token_price_usd);
      console.log(`📊 BNB Price from GeckoTerminal: $${bnbPriceUSD.toFixed(2)}`);
    }

    // Cache BNB price for frontend use
    await this.cache.put('bnb_price_usd', JSON.stringify({
      price: bnbPriceUSD,
      timestamp: Date.now()
    }), {
      expirationTtl: CACHE_TTL_SECONDS
    });

    for (const pool of pools) {
      try {
        // Extract token address from relationship ID (format: "bsc_0xADDRESS")
        const baseTokenId = pool.relationships.base_token.data.id;
        const tokenAddress = baseTokenId.replace('bsc_', '');

        // Extract symbol from pool name (format: "SYMBOL / WBNB")
        const poolName = pool.attributes.name || '';
        const symbol = poolName.split('/')[0]?.trim() || 'UNKNOWN';

        // Get prices
        const priceUSD = parseFloat(pool.attributes.base_token_price_usd || '0');
        const priceNative = parseFloat(pool.attributes.base_token_price_native_currency || '0');

        // Use native price if available, otherwise convert from USD
        const priceInBNB = priceNative > 0 ? priceNative : priceUSD / bnbPriceUSD;

        if (!priceInBNB || priceInBNB <= 0) {
          console.log(`⚠️ Skipping ${symbol} - invalid price`);
          continue;
        }

        // Get liquidity and volume
        const liquidityUSD = parseFloat(pool.attributes.reserve_in_usd || '0');
        const liquidityBNB = liquidityUSD / bnbPriceUSD;
        const volumeUSD24h = parseFloat(pool.attributes.volume_usd?.h24 || '0');
        const priceChange24h = parseFloat(pool.attributes.price_change_percentage?.h24 || '0');

        // Calculate age
        const createdAt = pool.attributes.pool_created_at
          ? new Date(pool.attributes.pool_created_at).getTime()
          : Date.now();
        const ageMins = Math.floor((Date.now() - createdAt) / 1000 / 60);

        // Estimate holders based on volume
        const holders = Math.max(Math.floor(volumeUSD24h / 100), 20);

        // Filter criteria
        if (liquidityBNB < 1) {
          console.log(`⚠️ Skipping ${symbol} - liquidity too low: ${liquidityBNB.toFixed(2)} BNB`);
          continue;
        }

        if (ageMins > 10080) { // Max 1 week old
          console.log(`⚠️ Skipping ${symbol} - too old: ${ageMins} minutes`);
          continue;
        }

        tokens.push({
          address: tokenAddress,
          symbol: symbol.substring(0, 20),
          priceInBNB,
          liquidityBNB,
          holders,
          ageMins,
          taxPct: 0, // Would need additional API
          isHoneypot: false, // Would need additional API
          ownerRenounced: false, // Would need additional API
          lpLocked: true, // Assume true for established pools
          volumeUSD24h,
          priceChange24h,
        });

        console.log(
          `✅ Added token: ${symbol} | ` +
          `Price: ${priceInBNB.toFixed(10)} BNB ($${priceUSD.toFixed(6)}) | ` +
          `Age: ${ageMins}m | Holders: ${holders} | Liq: ${liquidityBNB.toFixed(1)} BNB | ` +
          `Vol (24h): $${volumeUSD24h.toFixed(0)} | ` +
          `CA: ${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-6)} | ` +
          `Source: GeckoTerminal`
        );
      } catch (error) {
        console.error('Error processing pool:', error);
        continue;
      }
    }

    console.log(`Fetched ${tokens.length} tokens from GeckoTerminal`);

    if (tokens.length === 0) {
      console.warn('No valid tokens fetched, using fallback');
      return this.getFallbackTokens();
    }

    return tokens.slice(0, 50); // Limit to 50 tokens
  }

  /**
   * Check if we're within rate limit (450 req/min)
   */
  private async checkRateLimit(): Promise<boolean> {
    const key = 'geckoterminal:ratelimit';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    const stateStr = await this.cache.get(key);
    const state: RateLimitState = stateStr
      ? JSON.parse(stateStr)
      : { requestCount: 0, windowStart: now };

    // Reset window if expired
    if (now - state.windowStart >= windowMs) {
      state.requestCount = 0;
      state.windowStart = now;
    }

    // Check if we're at limit
    if (state.requestCount >= MAX_REQUESTS_PER_MINUTE) {
      console.warn(`⚠️ Rate limit reached: ${state.requestCount}/${MAX_REQUESTS_PER_MINUTE} req/min`);
      return false;
    }

    return true;
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(): Promise<void> {
    const key = 'geckoterminal:ratelimit';
    const now = Date.now();
    const windowMs = 60 * 1000;

    const stateStr = await this.cache.get(key);
    const state: RateLimitState = stateStr
      ? JSON.parse(stateStr)
      : { requestCount: 0, windowStart: now };

    // Reset window if expired
    if (now - state.windowStart >= windowMs) {
      state.requestCount = 1;
      state.windowStart = now;
    } else {
      state.requestCount++;
    }

    // Store with 2 minute expiration (buffer)
    await this.cache.put(key, JSON.stringify(state), {
      expirationTtl: 120,
    });

    console.log(`📊 Rate limit: ${state.requestCount}/${MAX_REQUESTS_PER_MINUTE} req/min`);
  }

  /**
   * Check if we're within monthly credit limit (480k/month)
   */
  private async checkCreditLimit(): Promise<boolean> {
    const currentMonth = this.getCurrentMonth();
    const key = `geckoterminal:credits:${currentMonth}`;

    const usageStr = await this.cache.get(key);
    const usage: CreditUsage = usageStr
      ? JSON.parse(usageStr)
      : { count: 0, month: currentMonth };

    if (usage.count >= MAX_CREDITS_PER_MONTH) {
      console.error(`❌ Credit limit reached: ${usage.count}/${MAX_CREDITS_PER_MONTH} for ${currentMonth}`);
      return false;
    }

    // Warn at 80% and 90%
    const percentUsed = (usage.count / MAX_CREDITS_PER_MONTH) * 100;
    if (percentUsed >= 90) {
      console.warn(`⚠️ WARNING: 90% of monthly credits used (${usage.count}/${MAX_CREDITS_PER_MONTH})`);
    } else if (percentUsed >= 80) {
      console.warn(`⚠️ 80% of monthly credits used (${usage.count}/${MAX_CREDITS_PER_MONTH})`);
    }

    return true;
  }

  /**
   * Increment monthly credit counter
   */
  private async incrementCredits(): Promise<void> {
    const currentMonth = this.getCurrentMonth();
    const key = `geckoterminal:credits:${currentMonth}`;

    const usageStr = await this.cache.get(key);
    const usage: CreditUsage = usageStr
      ? JSON.parse(usageStr)
      : { count: 0, month: currentMonth };

    usage.count++;

    // Store with expiration at end of month (+ 7 days buffer for queries)
    const daysInMonth = new Date(
      parseInt(currentMonth.split('-')[0]),
      parseInt(currentMonth.split('-')[1]),
      0
    ).getDate();
    const expirationTtl = (daysInMonth + 7) * 24 * 60 * 60; // days to seconds

    await this.cache.put(key, JSON.stringify(usage), {
      expirationTtl,
    });

    const percentUsed = ((usage.count / MAX_CREDITS_PER_MONTH) * 100).toFixed(1);
    console.log(`💳 Credits used: ${usage.count}/${MAX_CREDITS_PER_MONTH} (${percentUsed}%) for ${currentMonth}`);
  }

  /**
   * Get current month in YYYY-MM format
   */
  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get cached tokens if still fresh (GLOBAL cache via KV)
   */
  private async getCachedTokens(): Promise<CachedTokens | null> {
    const key = 'geckoterminal:tokens:latest';
    const cachedStr = await this.cache.get(key);

    if (!cachedStr) {
      return null;
    }

    const cached: CachedTokens = JSON.parse(cachedStr);
    const age = Date.now() - cached.timestamp;

    // Return cache if still fresh (within TTL)
    if (age < CACHE_TTL_SECONDS * 1000) {
      return cached;
    }

    return null;
  }

  /**
   * Check if another request is currently fetching from API (request coalescing)
   */
  private async getInFlightRequest(): Promise<boolean> {
    const key = 'geckoterminal:inflight';
    const inFlightStr = await this.cache.get(key);

    if (!inFlightStr) {
      return false;
    }

    const inFlight: InFlightRequest = JSON.parse(inFlightStr);
    const age = Date.now() - inFlight.timestamp;

    // Consider in-flight if less than 5 seconds old
    return age < 5000;
  }

  /**
   * Mark this request as in-flight
   */
  private async markInFlight(): Promise<void> {
    const key = 'geckoterminal:inflight';
    const inFlight: InFlightRequest = {
      timestamp: Date.now(),
      promise: null,
    };

    await this.cache.put(key, JSON.stringify(inFlight), {
      expirationTtl: 60, // 60 seconds minimum required by Cloudflare KV
    });
  }

  /**
   * Clear in-flight marker
   */
  private async clearInFlight(): Promise<void> {
    const key = 'geckoterminal:inflight';
    await this.cache.delete(key);
  }

  /**
   * Get stale cache (expired but still useful as fallback)
   */
  private async getStaleCache(): Promise<Token[] | null> {
    const key = 'geckoterminal:tokens:latest';
    const cachedStr = await this.cache.get(key);

    if (!cachedStr) {
      return null;
    }

    const cached: CachedTokens = JSON.parse(cachedStr);
    const age = Math.floor((Date.now() - cached.timestamp) / 1000);
    console.log(`Using stale cache (age: ${age}s)`);

    return cached.tokens;
  }

  /**
   * Cache tokens with TTL
   */
  private async cacheTokens(tokens: Token[]): Promise<void> {
    const key = 'geckoterminal:tokens:latest';
    const cached: CachedTokens = {
      tokens,
      timestamp: Date.now(),
      cacheKey: key,
    };

    // Store with 2x TTL to allow stale cache fallback
    await this.cache.put(key, JSON.stringify(cached), {
      expirationTtl: CACHE_TTL_SECONDS * 2,
    });

    console.log(`💾 Cached ${tokens.length} tokens (TTL: ${CACHE_TTL_SECONDS}s)`);
  }

  /**
   * Get usage stats for monitoring
   */
  async getUsageStats(): Promise<{
    credits: CreditUsage;
    rateLimit: RateLimitState;
  }> {
    const currentMonth = this.getCurrentMonth();
    const creditsKey = `geckoterminal:credits:${currentMonth}`;
    const rateLimitKey = 'geckoterminal:ratelimit';

    const creditsStr = await this.cache.get(creditsKey);
    const rateLimitStr = await this.cache.get(rateLimitKey);

    const credits: CreditUsage = creditsStr
      ? JSON.parse(creditsStr)
      : { count: 0, month: currentMonth };

    const rateLimit: RateLimitState = rateLimitStr
      ? JSON.parse(rateLimitStr)
      : { requestCount: 0, windowStart: Date.now() };

    return { credits, rateLimit };
  }

  /**
   * Fallback tokens when API is unavailable
   */
  private getFallbackTokens(): Token[] {
    const baseTime = Date.now();
    const priceVariation = Math.sin(baseTime / 10000) * 0.1 + 1;

    return [
      {
        address: '0x1111111111111111111111111111111111111111',
        symbol: 'MOMENTUM1',
        priceInBNB: 0.00123 * priceVariation,
        liquidityBNB: 45,
        holders: 150,
        ageMins: 180,
        taxPct: 5,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 15000,
        priceChange24h: 25.5 * priceVariation,
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        symbol: 'VOLUME1',
        priceInBNB: 0.00089 * priceVariation,
        liquidityBNB: 35,
        holders: 200,
        ageMins: 90,
        taxPct: 3,
        isHoneypot: false,
        ownerRenounced: true,
        lpLocked: true,
        volumeUSD24h: 35000,
        priceChange24h: 55.2 * priceVariation,
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        symbol: 'LAUNCH1',
        priceInBNB: 0.00156 * priceVariation,
        liquidityBNB: 25,
        holders: 80,
        ageMins: 30,
        taxPct: 8,
        isHoneypot: false,
        ownerRenounced: false,
        lpLocked: true,
        volumeUSD24h: 8000,
        priceChange24h: 120.8 * priceVariation,
      },
    ];
  }
}

/**
 * Helper function to create service instance
 */
export function createGeckoTerminalService(env: Env): GeckoTerminalService {
  return new GeckoTerminalService(env);
}
