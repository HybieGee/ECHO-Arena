# ECHO Arena - Project Information

## Critical Project Details
**DO NOT FORGET THESE:**

### GitHub Repository
- URL: https://github.com/HybieGee/ECHO-Arena
- Branch: main

### Cloudflare Deployment
- **Pages Project Name:** `echo-arena2` (NOT echo-arena!)
- **Current Frontend URL:** https://bb339e8b.echo-arena2.pages.dev (deployed Oct 27, 2025)
- Pages Dashboard: https://dash.cloudflare.com/7d721b5c1782592e2cd183ecd6793641/pages/view/echo-arena2
- **Worker Name:** `echo-arena-worker`
- Worker URL: https://echo-arena-worker.stealthbundlebot.workers.dev
- Account ID: 7d721b5c1782592e2cd183ecd6793641
- API Token: (stored in .claude/settings.local.json)

### Deployment Commands
```bash
# Frontend (Next.js)
cd apps/web
npm run build
rm -rf .next/cache
export CLOUDFLARE_API_TOKEN="0vJ4rcbSmiJ6JTpuGWCX5-HED97z56GvLpSA_c7K"
npx wrangler pages deploy .next --project-name=echo-arena2 --branch=main

# Worker (Hono API)
cd apps/worker
npx wrangler deploy
```

### Admin Access
- Admin wallet: 0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d
- Environment: ALLOWLIST_ADMINS includes this address

### Architecture
- Frontend: Next.js 14 (Cloudflare Pages)
- Backend: Hono API + Durable Objects (Cloudflare Workers)
- Database: D1 (SQLite)
- Storage: KV for results

### Recent Critical Fixes
1. Auto-settlement now updates D1 database (apps/worker/src/durable-objects/match-coordinator.ts)
2. Graph Y-axis clamped to 0-5 BNB (apps/web/src/app/arena/page.tsx)
3. Concurrent match prevention (apps/worker/src/routes/admin.ts)
