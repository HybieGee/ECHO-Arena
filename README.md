# ECHO Arena

**Build a bot in 500 chars. Trade 24h on real BSC data. Win BNB.**

ECHO Arena is a BSC-native AI trading game where users connect a wallet, create trading bots with short text prompts, and compete in 24-hour simulated trading battles using real-time market data.

## 🎮 Game Mechanics

- **Bot Creation**: Write a trading strategy in ≤500 characters
- **Entry Fee**: Week 1 free (1 bot/wallet), then 0.01 BNB worth of $ECHO burn
- **Duration**: 24-hour trading battles with live BSC price feeds
- **Prize**: Winner gets 1 BNB × min(%Gain, 500%), capped at 5 BNB
- **Simulation**: Real fees (0.25%), latency (2s), slippage (10bps)
- **Fair Play**: Deterministic execution, 60 orders max, 5s cooldown

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** (App Router) with TypeScript
- **TailwindCSS** for dark neon arena theme
- **wagmi + viem** for BSC wallet integration
- **WalletConnect v2** for multi-wallet support
- Deployed on **Cloudflare Pages**

### Backend
- **Cloudflare Workers** with Hono framework
- **D1 Database** (SQLite) for persistent storage
- **KV Storage** for caching and rate limiting
- **Durable Objects** for match coordination
- Real-time price data from **Dexscreener API**

### Packages
- `@echo-arena/dsl`: Strategy DSL schema (Zod) and parser
- `@echo-arena/sim`: Simulation engine with fee/slippage logic

## 📦 Monorepo Structure

```
/apps/web         Next.js frontend
/apps/worker      Cloudflare Worker backend
/packages/dsl     Strategy DSL package
/packages/sim     Simulation engine
/infra            Database schema & migrations
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account

### Installation

```bash
# Clone repository
git clone https://github.com/HybieGee/ECHO-Arena.git
cd ECHO-Arena

# Install dependencies
npm install

# Build packages
cd packages/dsl && npm run build
cd ../sim && npm run build
```

### Environment Setup

#### Worker (.env in `apps/worker/`)

```env
BSC_RPC_URL=https://bsc-dataseed.binance.org
ECHO_TOKEN_ADDRESS=0xYourEchoTokenAddress
FREE_START=2025-11-01T00:00:00Z
FREE_END=2025-11-08T00:00:00Z
ALLOWLIST_ADMINS=0xAdmin1,0xAdmin2
```

#### Web (.env.local in `apps/web/`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8787/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Database Setup

```bash
# Create D1 database
cd apps/worker
wrangler d1 create echo-arena-db

# Update wrangler.toml with database_id

# Run migrations
wrangler d1 migrations apply echo-arena-db --local
wrangler d1 migrations apply echo-arena-db
```

### Development

```bash
# Terminal 1: Run worker (backend)
npm run dev:worker

# Terminal 2: Run web (frontend)
npm run dev:web
```

- Frontend: http://localhost:3000
- Worker: http://localhost:8787

## 📊 Database Schema

### Tables

- **users**: Wallet addresses
- **matches**: 24h trading battles
- **bots**: User-created trading strategies
- **orders**: Simulated trade executions
- **balances**: PnL snapshots over time
- **burns**: Verified $ECHO token burns
- **winners**: Match results and prizes

## 🎯 Strategy DSL

Bots are defined using a constrained JSON DSL:

```json
{
  "universe": {
    "ageMinutesMax": 1440,
    "minLiquidityBNB": 10,
    "minHolders": 50
  },
  "entry": {
    "signal": "momentum",
    "threshold": 2.0,
    "maxPositions": 3,
    "allocationPerPositionBNB": 0.2
  },
  "risk": {
    "takeProfitPct": 20,
    "stopLossPct": 15,
    "cooldownSec": 5
  },
  "exits": {
    "timeLimitMin": 240,
    "trailingStopPct": 10
  },
  "blacklist": {
    "taxPctMax": 10,
    "honeypot": true,
    "lpLockedRequired": true
  }
}
```

### Signal Types

- `momentum`: Price momentum (24h change)
- `volumeSpike`: High volume relative to liquidity
- `newLaunch`: Recently launched tokens
- `socialBuzz`: Token holder count

## 🔐 Security

- **EIP-191 Signatures**: All writes require signed nonce challenges
- **Rate Limiting**: 5 submissions/hour/IP via KV token bucket
- **Input Sanitization**: Prompts validated, URLs/code blocks rejected
- **Burn Verification**: On-chain Transfer event verification via viem
- **Deterministic Execution**: Fair bot ordering by address

## 🎮 Gameplay Flow

### Week 1 (Free)

1. Connect BSC wallet
2. Write ≤500 char strategy prompt
3. Preview parsed DSL
4. Spawn bot (free for first bot)
5. Bot enters daily match

### After Week 1

1. Connect BSC wallet
2. Get required $ECHO amount (0.01 BNB worth)
3. Send $ECHO to burn address: `0x000000000000000000000000000000000000dEaD`
4. Submit tx hash for verification
5. Create bot and enter match

### During Match

- Bots trade every 10s based on strategy
- Leaderboard updates every minute
- View bot details, orders, PnL curves

### Settlement

- Match ends after 24h
- Winner determined by highest final balance
- Prize: 1 BNB × min(% gain, 500%), max 5 BNB
- Admin marks winner as paid (manual for MVP)

## 🛠️ Deployment

### Frontend (Cloudflare Pages)

```bash
cd apps/web
npm run build
wrangler pages deploy .next
```

### Worker (Cloudflare Workers)

```bash
cd apps/worker
npm run deploy
```

### First Time Setup

```bash
# Create KV namespaces
wrangler kv:namespace create CACHE
wrangler kv:namespace create RATE_LIMIT
wrangler kv:namespace create RESULTS

# Update wrangler.toml with IDs
```

## 📡 API Endpoints

### Public

- `GET /api/config` - Game configuration
- `POST /api/auth/nonce` - Get auth challenge
- `POST /api/auth/verify` - Verify signature
- `GET /api/burn/price` - Get $ECHO burn price
- `POST /api/burn/verify` - Verify burn transaction
- `POST /api/bot` - Create bot
- `GET /api/bot/:id` - Get bot details
- `GET /api/match/current` - Current match info
- `GET /api/leaderboard` - Live leaderboard

### Admin (Requires auth header)

- `POST /api/admin/match/create` - Create match
- `POST /api/admin/match/:id/start` - Start match
- `POST /api/admin/match/:id/settle` - Settle match
- `POST /api/admin/winner/:id/mark-paid` - Mark winner paid

## 🧪 Testing

```bash
# DSL parser tests
cd packages/dsl
npm test

# Simulation engine tests
cd packages/sim
npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **D1 Migration Fails**: Ensure database_id in wrangler.toml is correct
2. **Wallet Won't Connect**: Check WalletConnect project ID
3. **Burn Verification Fails**: Verify BSC_RPC_URL and token address
4. **Rate Limit Errors**: KV namespace IDs must be set correctly

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🔗 Links

- **GitHub**: https://github.com/HybieGee/ECHO-Arena
- **Docs**: Coming soon
- **Discord**: Coming soon

---

**Built with ❤️ on Cloudflare & BSC**
