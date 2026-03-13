# ThesisX — Buildathon Demo Guide

Use this checklist for AKINDO / SoSoValue Buildathon submission and judge review.

## Required environment (Vercel + local)

```env
BUILDATHON_MODE=true
DEMO_MODE=false
EXECUTION_MODE=testnet
SOSOVALUE_API_KEY=<your-key>
SODEX_API_KEY_NAME=thesisx-api-01
SODEX_API_PRIVATE_KEY=<generated-locally>
SODEX_ACCOUNT_ID=0
SODEX_USER_ADDRESS=<master-wallet>
WALLET_SESSION_SECRET=<random-secret>
CRON_SECRET=<random-secret>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<reown-id>
NEXT_PUBLIC_APP_URL=<vercel-url>
DATABASE_URL=<postgresql-url>
```

## Pre-demo verification

```bash
npm run verify:soso
npm run verify:sodex
npm run validate:env
npm test
npm run build
```

Manual API checks:

- `GET /api/health` — overall readiness
- `GET /api/intelligence/health?live=true` — all 9 SoSo modules
- `GET /api/sodex/test` — account `aid`, registered API key name

## SoDEX setup (one-time)

1. Connect master wallet on ValueChain testnet.
2. Settings → **Generate API key pair** (requires signed wallet session).
3. Register on testnet: Settings → **Register on testnet (wallet signs)** (`POST .../accounts/api-keys`). No mainnet apikeys page or access application required.
4. Confirm `aid` from `GET .../accounts/{wallet}/state` (primary account is often `0`).
5. Set env vars on Vercel and redeploy.

## 5-minute judge flow

1. **Landing** — explain research-to-execution positioning.
2. **Settings** — show SoSo module health (9 modules), SoDEX testnet ready, kill switch off.
3. **Create** — connect wallet, use preset prompt, show live module fetch + signal map.
4. **Approve** — sign disclosure + execution approval; confirm SoDEX order refs (not `mock-*`).
5. **Dashboard** — pending approve panel, execution orders, intelligence refresh, rebalance.
6. **Marketplace** — public fund with live data badge and SoSo module tags.
7. **Docs** — `/docs#buildathon-demo` and API reference.

## APIs integrated

| Provider | Modules / actions |
|----------|-------------------|
| SoSoValue | Currency, ETF, Macro, Crypto Stocks, Feeds, SSI Indexes, Fundraising, BTC Treasuries, Analysis Charts |
| SoDEX | Account state, API key list, balances, signed spot `newOrder`, order reconcile |

## Safety controls to mention

- Wallet-signed session + separate execution approval
- Risk engine caps (position, sector, drawdown, exclusions)
- Global and per-fund kill switches
- Fail-closed execution (fund stays pending if SoDEX submit fails)
- Mainnet disabled unless `ALLOW_MAINNET=true`

## Wave changelog template

- Added all 9 SoSo modules to fund-create packet
- Signal-weighted deterministic committee allocations
- Dashboard initial execution approval + SoDEX order panel
- Secured SoDEX key generation endpoint
- `npm run verify:sodex` readiness script
