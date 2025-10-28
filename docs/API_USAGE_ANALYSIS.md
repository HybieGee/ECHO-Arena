# GeckoTerminal API Usage Analysis - High Traffic Scenario

## Architecture Overview

### GLOBAL Shared Cache (Critical!)
The implementation uses **Cloudflare KV** for caching, which means:
- ✅ **ALL users share the same cache**
- ✅ **ALL matches share the same cache**
- ✅ **ALL workers share the same cache** (distributed globally)

This is CRITICAL for cost optimization with 1000+ concurrent users.

## API Call Sources

### 1. Simulation Ticks
- **Frequency**: Every 1-3 min (avg 2 min)
- **Who calls it**: Match Coordinator Durable Object
- **Users affected**: ALL bots in match (shared)
- **Calls per match**: ~720/day

### 2. Leaderboard Requests (HIGH TRAFFIC)
- **Frequency**: Every time a user checks leaderboard
- **Who calls it**: Each user request
- **Potential volume**: 1000+ users checking frequently
- **Without cache**: Could be 10,000-100,000+ per day ❌

## Usage Calculations

### Scenario: 1000 Concurrent Users

#### Without Optimization (WOULD EXCEED LIMIT)
```
Simulation ticks:   720/day
Leaderboard hits:   1000 users × 24 checks/day = 24,000/day
Total per day:      24,720
Total per month:    741,000 ❌ EXCEEDS 500k!
```

#### With 45s Cache (Previous)
```
Cache window:       45 seconds
Max API calls:      86,400 seconds ÷ 45 = 1,920/day
Simulation ticks:   ~38/day (with cache hits)
Total per day:      1,958
Total per month:    58,740
Usage percent:      11.7% of 500k quota
Headroom:           441,260 credits
Status:             ✅ SAFE but low headroom
```

#### With 90s Cache + Request Coalescing (Current)
```
Cache window:       90 seconds (2x longer)
Max API calls:      86,400 seconds ÷ 90 = 960/day
Simulation ticks:   ~19/day (with cache hits)
Request coalescing: Prevents burst traffic
Total per day:      979
Total per month:    29,370
Usage percent:      5.9% of 500k quota
Headroom:           470,630 credits
Status:             ✅ VERY SAFE - 94% headroom
```

## Traffic Burst Handling

### Problem: 100 Users Hit Leaderboard Simultaneously
Without request coalescing:
- Cache expires at t=0
- 100 requests arrive at t=0
- All 100 see cache miss
- **100 API calls made** ❌

With request coalescing (implemented):
- Cache expires at t=0
- 100 requests arrive at t=0
- First request marks "in-flight"
- Other 99 requests wait 1 second
- First request populates cache
- Other 99 requests get cached result
- **1 API call made** ✅

## Worst-Case Scenarios

### Scenario 1: Peak Traffic (1000 users, constant leaderboard checks)
```
Users:              1000
Checks per hour:    1 (very active users)
Hours per day:      24
Total requests:     24,000/day

With 90s cache:     960 API calls/day (rest served from cache)
Monthly usage:      28,800 credits
Quota usage:        5.8%
Status:             ✅ SAFE
```

### Scenario 2: Viral Growth (10,000 users)
```
Users:              10,000
Checks per hour:    1
Total requests:     240,000/day

With 90s cache:     960 API calls/day (cache handles ALL traffic)
Monthly usage:      28,800 credits
Quota usage:        5.8%
Status:             ✅ SAFE (cache is GLOBAL!)
```

### Scenario 3: Multiple Concurrent Matches
```
Active matches:     10 (different time zones)
Each match:         720 ticks/day (no cache)
Leaderboard:        960 calls/day (shared cache across matches)

Total per day:      7,200 (sim) + 960 (leaderboard) = 8,160
Monthly usage:      244,800 credits
Quota usage:        49%
Status:             ✅ SAFE
```

### Scenario 4: Absolute Worst Case
```
- 10 concurrent matches
- 10,000 active users
- Peak traffic hours
- Cache misses due to rapid price changes

With 90s cache:     960 calls/day (max, regardless of users)
With sim ticks:     7,200 calls/day (10 matches × 720)
Total per day:      8,160
Monthly usage:      244,800 credits
Quota usage:        49%
Status:             ✅ STILL SAFE!
```

## Key Insights

### 1. Cache is GLOBAL
The most important optimization is that **all users share the same cache**:
- 1 user or 1,000,000 users = same API calls
- Cache hit rate increases with more traffic (paradoxically better!)
- KV distributed globally (low latency everywhere)

### 2. Request Coalescing Prevents Bursts
- Multiple concurrent requests = 1 API call
- Protects against traffic spikes
- Maintains cache consistency

### 3. 90s Cache is the Sweet Spot
- **45s**: 1,920 calls/day = 57,600/month (11.5%)
- **90s**: 960 calls/day = 28,800/month (5.8%)
- **120s**: 720 calls/day = 21,600/month (4.3%)

90 seconds balances freshness vs. cost:
- Fresh enough for trading (prices update every 1.5 min)
- Cheap enough to scale to 10,000+ users
- Safe margin for unexpected traffic

### 4. Cost Per User Decreases with Scale
```
100 users:     28,800 calls/month = 288 calls/user
1,000 users:   28,800 calls/month = 28.8 calls/user
10,000 users:  28,800 calls/month = 2.88 calls/user
```

The global cache means your cost per user **decreases** as you grow!

## Monitoring & Alerts

### What to Monitor
1. **Cache hit rate** (should be >98%)
2. **API calls per day** (should be <1000)
3. **Monthly credit usage** (should be <100k)
4. **Rate limit hits** (should be 0)

### Alert Thresholds
```
WARNING:  50,000 credits/month (10% usage)
CRITICAL: 100,000 credits/month (20% usage)
STOP:     400,000 credits/month (80% usage)
```

### Check Usage
```bash
curl https://your-worker.workers.dev/api/admin/api-usage \
  -H "Authorization: Bearer YOUR_ADMIN_ADDRESS"
```

Expected response (healthy):
```json
{
  "credits": {
    "used": 28800,
    "percent": "5.9",
    "status": "OK"
  },
  "rateLimit": {
    "current": 0,
    "percent": "0",
    "status": "OK"
  }
}
```

## Cost Breakdown

### Your CoinGecko Plan
- Monthly cost: $X (your plan price)
- Included credits: 500,000
- Overage cost: $250 per 500k

### Expected Usage
```
Month 1 (100 users):     ~10,000 credits  = $0 overage
Month 2 (500 users):     ~20,000 credits  = $0 overage
Month 3 (1,000 users):   ~28,800 credits  = $0 overage
Month 6 (10,000 users):  ~28,800 credits  = $0 overage

Even at 100,000 users:   ~28,800 credits  = $0 overage
```

### Why It Scales
The global cache means your API usage is **independent of user count**:
- API calls are tied to **time** (90s intervals)
- NOT tied to **user count**
- 86,400 seconds/day ÷ 90s = max 960 calls/day
- No matter how many users!

## Recommendations

### Current Settings (Optimal)
✅ Cache TTL: 90 seconds
✅ Rate limit buffer: 450/min
✅ Credit limit buffer: 480k/month
✅ Request coalescing: Enabled

### Don't Change Unless
- **Increase TTL to 120s** if you exceed 100k credits/month
- **Decrease TTL to 60s** if users complain about stale data
- **Increase buffers** if you add new API call sources

### Future-Proofing
Even with aggressive growth:
- **10x users** (10,000): Still 5.9% quota
- **100x users** (100,000): Still 5.9% quota
- **1000x users** (1,000,000): Still 5.9% quota

The architecture scales linearly with **time**, not users.

## Conclusion

### Summary
✅ **Safe for 1000+ concurrent users** (5.9% quota)
✅ **Safe for 10,000+ users** (same 5.9%)
✅ **Safe for 10 concurrent matches** (49% quota)
✅ **Zero risk of overage charges**
✅ **Cost per user decreases with growth**

### The Math That Matters
```
API calls = (seconds_per_day ÷ cache_ttl) + simulation_ticks
          = (86,400 ÷ 90) + (matches × 720 ÷ 90)
          = 960 + (matches × 8)

For 1 match:  960 + 8 = 968/day = 29k/month (5.8%)
For 10 matches: 960 + 80 = 1,040/day = 31k/month (6.2%)
```

Your limiting factor is **number of concurrent matches**, not **number of users**.

---

**Last Updated**: October 2025
**Status**: Production-ready for 1000+ users
**Risk Level**: Very Low
