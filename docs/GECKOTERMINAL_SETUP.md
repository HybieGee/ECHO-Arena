# GeckoTerminal API Setup Guide

## Overview

The ECHO Arena now uses GeckoTerminal API (via CoinGecko) for fetching real-time BSC token data. This guide explains how to set up and monitor your API usage.

## API Limits

Your CoinGecko API plan includes:
- **500,000 credits/month** (1 API call = 1 credit)
- **500 requests/minute**
- **Overage charges**: $250 per additional 500k calls

## Built-in Safeguards

We've implemented multiple layers of protection:

### 1. Rate Limiting
- **Hard limit**: 450 req/min (buffer below 500)
- Automatically blocks requests if limit exceeded
- Falls back to cached data
- Resets every minute

### 2. Credit Tracking
- **Hard limit**: 480,000 credits/month (buffer below 500k)
- Tracks monthly usage (resets on 1st of each month)
- Warns at 80% and 90% usage
- Falls back to cached data if exceeded

### 3. Aggressive Caching
- **Cache TTL**: 45 seconds
- Minimizes redundant API calls
- Stale cache used as fallback when limits hit
- Reduces costs significantly

## Usage Estimates

### Current Implementation
- Match runs 24 hours
- Simulation ticks every 1-3 minutes (avg 2 min)
- **~720 API calls per match**
- Plus leaderboard fetches (~10-50/day)

### Monthly Projection
- Continuous matches: **~21,600 calls/month**
- Well under 500k limit
- Only **4.5%** of monthly quota

## Setup Instructions

### 1. Get Your API Key
1. Sign up for CoinGecko API: https://www.coingecko.com/en/api/pricing
2. Select the plan with 500k credits/500 req/min (likely "Analyst" tier)
3. Copy your API key

### 2. Configure Environment Variables

Edit `apps/worker/wrangler.toml`:

```toml
COINGECKO_API_KEY = "your-actual-api-key-here"
```

### 3. Deploy

```bash
cd apps/worker
npx wrangler deploy
```

## Monitoring Usage

### Admin API Endpoint

**GET** `/api/admin/api-usage`

Returns real-time usage statistics:

```json
{
  "credits": {
    "used": 1234,
    "limit": 480000,
    "hardLimit": 500000,
    "percent": "0.26",
    "month": "2025-10",
    "status": "OK"
  },
  "rateLimit": {
    "current": 5,
    "limit": 450,
    "hardLimit": 500,
    "percent": "1.11",
    "resetsIn": "45s",
    "status": "OK"
  },
  "warnings": []
}
```

### Status Values
- **OK**: Normal operation
- **WARNING**: 80-90% usage
- **EXCEEDED**: Limit reached, using cached data

### Example Request

```bash
curl -X GET "https://your-worker.workers.dev/api/admin/api-usage" \
  -H "Authorization: Bearer YOUR_ADMIN_ADDRESS"
```

## Cost Optimization Tips

### 1. Monitor Regularly
Check `/api/admin/api-usage` daily to track consumption

### 2. Adjust Cache TTL
If hitting limits, increase cache duration in `apps/worker/src/lib/geckoterminal.ts`:

```typescript
const CACHE_TTL_SECONDS = 60; // Increase from 45 to 60 or more
```

### 3. Reduce Match Frequency
If running multiple concurrent matches, space them out to reduce API load

### 4. Use Fallback Tokens
The system automatically falls back to mock data if limits exceeded - no downtime!

## Logs

Watch real-time API usage in Cloudflare logs:

```bash
npx wrangler tail
```

Look for these log messages:
- `✅ Using cached tokens` - No API call made
- `🌐 Fetching fresh data from GeckoTerminal API` - API call made
- `📊 Rate limit: X/450 req/min` - Current rate limit usage
- `💳 Credits used: X/480000` - Monthly credit usage
- `⚠️ WARNING: 90% of monthly credits used` - High usage warning
- `❌ Credit limit reached` - Limit exceeded, using cache

## Troubleshooting

### API Key Not Working
- Verify key is correct in wrangler.toml
- Ensure you've deployed: `npx wrangler deploy`
- Check Cloudflare dashboard for environment variables

### High Credit Usage
1. Check `/api/admin/api-usage` endpoint
2. Review logs for excessive API calls
3. Increase cache TTL
4. Reduce match frequency

### Rate Limit Exceeded
- System automatically falls back to cached data
- No action needed - wait 1 minute for reset
- Consider increasing buffer in `MAX_REQUESTS_PER_MINUTE`

## Architecture

### Files Modified
- `apps/worker/src/lib/geckoterminal.ts` - New service with rate limiting
- `apps/worker/src/durable-objects/match-coordinator.ts` - Updated to use GeckoTerminal
- `apps/worker/src/routes/admin.ts` - Added `/api-usage` endpoint
- `apps/worker/src/types.ts` - Added `COINGECKO_API_KEY` type
- `apps/worker/wrangler.toml` - Added environment variable

### How It Works

1. **Match Coordinator** calls `fetchUniverse()` every 1-3 minutes
2. **GeckoTerminal Service** checks cache first (45s TTL)
3. If cache miss, checks rate limit and credit limit
4. If within limits, makes API call and increments counters
5. If exceeded, returns stale cache or fallback tokens
6. Results cached in Cloudflare KV for next request

### Storage

- **Rate Limit State**: KV with 2-minute expiration
- **Credit Counter**: KV with month-end expiration
- **Token Cache**: KV with 90-second expiration (2x TTL)

## Support

For issues or questions:
1. Check logs: `npx wrangler tail`
2. Monitor usage: `/api/admin/api-usage`
3. Review this documentation

---

**Last Updated**: October 2025
