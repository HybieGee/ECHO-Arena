# ECHO Arena - API Architecture Diagram

## How Fresh Data Flows (Option A - Implemented)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GECKOTERMINAL API                             │
│                  (500k credits/month)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ API Calls
                         │
        ┌────────────────┴──────────────────┐
        │                                   │
        │  SIMULATION TICK                  │  USER VIEWING
        │  (skipCache=true)                 │  (skipCache=false)
        │                                   │
        ▼                                   ▼
   ┌──────────┐                     ┌──────────────┐
   │  FRESH   │                     │ CHECK CACHE  │
   │  FETCH   │                     │  (90s TTL)   │
   └────┬─────┘                     └──────┬───────┘
        │                                  │
        │                          ┌───────┴────────┐
        │                          │                │
        │                     Cache Hit?      Cache Miss?
        │                          │                │
        │                    Return Cache     Fetch Fresh
        │                          │                │
        │                          └────────┬───────┘
        │                                   │
        │                            ┌──────▼────────┐
        │                            │  Update Cache │
        │                            │   (90s TTL)   │
        │                            └───────────────┘
        │                                   │
        ▼                                   ▼
   ┌─────────────────────────────────────────────────┐
   │        Match Coordinator (Durable Object)       │
   │  ┌───────────────────────────────────────────┐  │
   │  │  Simulation Tick (every 1-3 min)          │  │
   │  │                                           │  │
   │  │  1. Fetch FRESH prices                   │  │
   │  │  2. For each bot (in order):             │  │
   │  │     - Evaluate strategy                  │  │
   │  │     - Execute trades                     │  │
   │  │  3. Update balances                      │  │
   │  │  4. Persist state                        │  │
   │  └───────────────────────────────────────────┘  │
   └─────────────────────────────────────────────────┘
                         │
                         │
                         ▼
              ┌──────────────────┐
              │  Leaderboard     │
              │  (returns state) │
              └────────┬─────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │   1000 USERS        │
            │   (see cached data) │
            └─────────────────────┘
```

## API Call Breakdown (1000 Users)

### Scenario: 24-Hour Match with 1000 Active Users

```
┌────────────────┬──────────────┬────────────────┬──────────────┐
│  Source        │  Frequency   │  Uses Cache?   │  API Calls   │
├────────────────┼──────────────┼────────────────┼──────────────┤
│  Simulation    │  Every 2min  │  NO (fresh)    │  720/day     │
│  Leaderboard   │  1000 users  │  YES (90s)     │  960/day     │
│  (users)       │  × 24/day    │  (shared)      │  (max)       │
└────────────────┴──────────────┴────────────────┴──────────────┘

TOTAL PER DAY:    ~1,680 API calls
TOTAL PER MONTH:  ~50,400 API calls
QUOTA USAGE:      10% of 500k credits
HEADROOM:         449,600 credits (90%)
```

## Cache Behavior

### Timeline Example

```
Time    Event                        Action              API Call?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14:00   Simulation Tick 1            Fetch fresh         ✅ YES
14:00   Cache updated                Store for 90s       -
14:00   User 1 checks leaderboard    Use cache (0s old)  ❌ NO
14:01   User 2-100 check             Use cache (60s)     ❌ NO
14:01   User 101-500 check           Use cache (60s)     ❌ NO
14:02   Simulation Tick 2            Fetch fresh         ✅ YES
14:02   Cache updated                Store for 90s       -
14:02   User 501-1000 check          Use cache (0s old)  ❌ NO
14:03   User 1 checks again          Use cache (60s)     ❌ NO
14:04   Simulation Tick 3            Fetch fresh         ✅ YES
...continues...

RESULT: 720 simulation calls + ~960 max from cache misses = 1,680/day
```

## Bot Competition (Within a Single Tick)

```
┌──────────────────────────────────────────────────────────────┐
│  TICK 1 at 14:00:00                                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  1. Fetch Universe (FRESH PRICES)                      │  │
│  │     TOKEN_A: 0.001 BNB, momentum: +75%                 │  │
│  │     TOKEN_B: 0.005 BNB, volume: $200k                  │  │
│  │     ... 48 more tokens                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  2. Process Bots (SAME PRICES, DIFFERENT STRATEGIES)   │  │
│  │                                                         │  │
│  │  Bot 1 (Momentum Trader):                              │  │
│  │    Rule: "priceChange24h > 50% → BUY"                  │  │
│  │    ✅ Sees TOKEN_A (+75%) → BUYS 0.2 BNB               │  │
│  │                                                         │  │
│  │  Bot 2 (Volume Trader):                                │  │
│  │    Rule: "volume > $100k → BUY"                        │  │
│  │    ✅ Sees TOKEN_B ($200k) → BUYS 0.15 BNB             │  │
│  │                                                         │  │
│  │  Bot 3 (Contrarian):                                   │  │
│  │    Rule: "priceChange24h < -20% → BUY"                 │  │
│  │    ❌ Sees no matches → Holds cash                     │  │
│  │                                                         │  │
│  │  ... 48 more bots with different strategies            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

RESULT: Same prices, different actions = COMPETITION!
```

## Key Insights

### 1. Cache is for USERS, not SIMULATION

```
SIMULATION PATH (Fresh):
User Action → Check Leaderboard → Match Coordinator → Skip Cache
  → GeckoTerminal API → Fresh Prices → Bot Trading

USER VIEW PATH (Cached):
User Action → Check Leaderboard → Match Coordinator → Use Cache
  → Return Cached Data (90s old) → Display to User
```

### 2. All Bots See Same Prices (By Design)

This is **INTENTIONAL** for fairness:
- ❌ NO: Each bot gets different prices (unfair timing advantage)
- ✅ YES: All bots get same prices (fair strategy competition)

### 3. Cache Doesn't Affect Game Mechanics

```
Without Cache (naive):
- 720 simulation calls
- 24,000 leaderboard calls (1000 users × 24)
- Total: 24,720/day = 741,000/month
- ❌ EXCEEDS QUOTA!

With Cache (smart):
- 720 simulation calls (fresh)
- 960 leaderboard calls (cached, served to all users)
- Total: 1,680/day = 50,400/month
- ✅ Only 10% quota!
```

## Comparison Table

```
┌──────────────┬────────────┬───────────┬──────────┬───────────┐
│  Option      │  Sim Data  │  User Data│  Cost    │  Realism  │
├──────────────┼────────────┼───────────┼──────────┼───────────┤
│  A (Current) │  Fresh     │  Cached   │  10%     │  ⭐⭐⭐⭐⭐  │
│  B (Cached)  │  Cached    │  Cached   │  6%      │  ⭐⭐⭐     │
│  C (30s TTL) │  Fresh     │  30s      │  17%     │  ⭐⭐⭐⭐   │
└──────────────┴────────────┴───────────┴──────────┴───────────┘

RECOMMENDATION: Option A (Current) - Best balance
```

## Scaling Analysis

```
Number of Users vs API Calls (Option A)

Users     Simulation   Leaderboard   Total/Day   Quota %
────────────────────────────────────────────────────────
1         720          960           1,680       10%
10        720          960           1,680       10%
100       720          960           1,680       10%
1,000     720          960           1,680       10%
10,000    720          960           1,680       10%
100,000   720          960           1,680       10%

⚠️ API usage independent of user count (due to cache)!
```

## What Would Break It?

```
✅ SAFE: 1 match, 1,000,000 users → 10% quota
✅ SAFE: 1 match, unlimited users → 10% quota
✅ SAFE: 10 matches, 1,000 users → 50% quota
❌ RISK: 20+ matches simultaneously → >100% quota
```

Your architecture: **1 match at a time** = Perfectly safe!

## Monitoring Commands

```bash
# Deploy
cd apps/worker
npx wrangler deploy

# Watch real-time logs
npx wrangler tail

# Check API usage
curl https://your-worker.workers.dev/api/admin/api-usage \
  -H "Authorization: Bearer YOUR_ADMIN_ADDRESS"

# Expected output:
{
  "credits": {
    "used": 1680,        # ~1680/day
    "limit": 480000,
    "percent": "0.35",   # Should stay <1% per day
    "status": "OK"
  },
  "rateLimit": {
    "current": 1,
    "limit": 450,
    "percent": "0.22",
    "status": "OK"
  }
}
```

## Summary

### Your Question
> "Won't same cached data kill competition with 1000 users?"

### Answer
**No!** Because:

1. ✅ **Simulation gets FRESH data** (skipCache=true)
2. ✅ **Users get CACHED data** (viewing only)
3. ✅ **All bots see same prices** (by design, for fairness)
4. ✅ **Competition is strategy-based** (not timing-based)
5. ✅ **Scales to unlimited users** (10% quota regardless)

### Implementation Status
- ✅ Option A implemented (fresh simulation, cached leaderboard)
- ✅ Build tested and passing
- ✅ Ready to deploy
- ✅ Documentation complete

### Next Step
Add your CoinGecko API key and deploy! 🚀

---

**Architecture**: Production-ready
**Scalability**: 1,000,000+ users
**Cost**: 10% of quota
**Game Integrity**: Preserved
