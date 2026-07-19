# ThesisX

**The AI operating system for on-chain finance** - SoSoValue intelligence to AI investment committee to SoDEX testnet execution.

Built for the SoSoValue Buildathon (*One-Person Autonomous Financial Businesses*). Powered by [SoSoValue](https://sosovalue.com). Executed via [SoDEX](https://sodex.com).

## What's live today

- **Create AI Fund** - wallet session, strategy presets, risk/cadence/exclusions, live SoSo packet, committee allocations, signal map, disclosure + signed execution approval
- **SoSoValue intelligence (9 modules)** - currencies (with live market-snapshot prices), ETF flows, macro, crypto stocks, feeds, SSI indexes, fundraising, BTC treasuries, analysis charts
- **AI investment committee + risk engine** - multi-agent votes, allocation caps, fail-closed when execution is blocked; deterministic fallback without `OPENAI_API_KEY`
- **SoDEX testnet execution** - EIP-712 spot orders, API-key setup/register, readiness checks, order reconcile + live NAV marks
- **Fund dashboard** - approve pending trades, propose/approve rebalance, refresh intelligence, NAV chart, AI copilot, **live order tape** (SSE)
- **Marketplace + paper strategy mirrors** - follow public funds to paper NAV, allocations, vs-leader PnL, mirror timeline on `/dashboard/following/[slug]`
- **Autonomous cron OS** - hourly `/api/cron/tick` (intel, alerts, NAV, weekly memo, committee, reconcile); rebalance runner every 6h
- **SoSo alerts + weekly research desk** - deduped alerts; cron-generated weekly memos with archive/copy/share
- **Market Pulse SSE** - landing streams live/cached SoSo pulse via `/api/stream?channel=market-pulse`
- **Wallet watchlists** - track addresses from Settings/Dashboard (plan-limited slots)
- **Safety** - global + per-fund kill switches, mainnet gated, Settings readiness / SoSo health / SoDEX connection test
- **Deploy** - Next.js 15 on Vercel, Prisma + Postgres (Neon), buildathon env profile

## Quick start

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Buildathon submission profile

```env
BUILDATHON_MODE=true
DEMO_MODE=false
EXECUTION_MODE=testnet
SOSOVALUE_API_KEY=<your-key>
SODEX_API_KEY_NAME=default
SODEX_API_PRIVATE_KEY=<testnet-private-key>
SODEX_ACCOUNT_ID=0
SODEX_USER_ADDRESS=<master-wallet>
WALLET_SESSION_SECRET=<random-secret>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<reown-project-id>
CRON_SECRET=<random-secret>
DATABASE_URL=<postgres-neon-url>
```

Verify integrations:

```bash
npm run verify:soso
npm run verify:sodex
npm run validate:env
npm test
```

Optional currency price check: `npx tsx scripts/verify-currency-prices.ts`  
Full judge checklist: [docs/buildathon-demo.md](docs/buildathon-demo.md).

## 5-minute judge demo

1. Landing - confirm live **Market Pulse** and preset prompts.
2. **Settings** - readiness green, SoSo module health, **Test SoDEX connection**.
3. **Create** - connect wallet, pick preset, review SoSo signal-to-allocation map, Generate.
4. Approve execution - verify SoDEX order references (not `mock-*`).
5. **Dashboard** - approve pending execution if needed, live order tape, propose/approve rebalance.
6. **Marketplace** - open public fund, **Open paper mirror**, paper NAV / allocations / timeline.
7. **Docs** - `#buildathon-demo` for architecture and API proof.

## Environment

| Variable | Purpose |
|----------|---------|
| `BUILDATHON_MODE` | Strict live-only profile (`true` for submission) |
| `SOSOVALUE_API_KEY` | Live SoSoValue OpenAPI |
| `OPENAI_API_KEY` | LLM committee (deterministic fallback if absent) |
| `DEMO_MODE` | Demo intelligence fallback (`false` for submission) |
| `EXECUTION_MODE` | `testnet` for submission |
| `SODEX_*` | SoDEX testnet credentials (`SODEX_ACCOUNT_ID` often `0`) |
| `SOSO_MIN_MODULES_OK` | Minimum live SoSo modules before fund create (default 6) |
| `WALLET_SESSION_SECRET` | Signed wallet session tokens |
| `CRON_SECRET` | Protects `/api/cron/tick` and `/api/rebalance/run` |
| `DATABASE_URL` | Postgres (Neon in production; local Postgres or `file:` for SQLite) |

See [docs/api-validation.md](docs/api-validation.md) and [.env.example](.env.example).

## Architecture

| Layer | Location |
|-------|----------|
| Frontend | Next.js 15, Tailwind v4 |
| Intelligence | `src/lib/soso/` - 9 modules, market-snapshot prices, signal provenance |
| AI committee | `src/lib/ai/committee.ts` + risk engine |
| Execution | `src/lib/sodex/` - testnet EIP-712 orders, reconcile, order tape |
| Paper mirrors | `src/lib/copy-trading.ts` + following dashboard |
| Jobs / alerts | `/api/cron/tick`, weekly desk, SoSo alert fanout |
| Auth | Signed wallet sessions - `src/lib/auth/session.ts` |
| Data | Prisma + Postgres |

## Product surface

| Route | Purpose |
|-------|---------|
| `/` | Landing + Market Pulse SSE |
| `/create` | AI fund generator (Describe to Generate to Review to Approve to Monitor) |
| `/dashboard` | Portfolio overview, watchlists, alerts |
| `/dashboard/[slug]` | Fund ops, rebalance, copilot, live order tape |
| `/dashboard/following/[slug]` | Paper strategy mirror |
| `/marketplace` | Public funds + follow |
| `/settings` | Readiness, SoDEX setup, watchlists, kill switch |
| `/docs` | Architecture + buildathon demo notes |
