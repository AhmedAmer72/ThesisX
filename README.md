# ThesisX

**Launch Your AI Hedge Fund** — AI-native autonomous on-chain fund operating system powered by [SoSoValue](https://sosovalue.com) intelligence and [SoDEX](https://sodex.com) execution.

## Quick start

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Buildathon submission profile

Set these in `.env` for judge-ready live mode:

```env
BUILDATHON_MODE=true
DEMO_MODE=false
EXECUTION_MODE=testnet
SOSOVALUE_API_KEY=<your-key>
SODEX_API_KEY_NAME=thesisx-api-01
SODEX_API_PRIVATE_KEY=<testnet-private-key>
SODEX_ACCOUNT_ID=0
SODEX_USER_ADDRESS=<master-wallet>
WALLET_SESSION_SECRET=<random-secret>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<reown-project-id>
CRON_SECRET=<random-secret>
```

Verify integrations:

```bash
npm run verify:soso
npm run verify:sodex
npm run validate:env
npm test
```

Full judge checklist: [docs/buildathon-demo.md](docs/buildathon-demo.md).

## 5-minute judge demo

1. Landing → confirm live **Market Pulse** and preset prompts.
2. **Settings** → readiness checklist green, SoSo module health, **Test SoDEX connection**.
3. **Create** → connect wallet → pick preset → review SoSo signal-to-allocation map.
4. Approve execution → verify SoDEX order references (not `mock-*`).
5. **Dashboard** → approve pending execution if needed → refresh intelligence → propose/approve rebalance.
6. **Marketplace** → open public fund → **Open paper mirror** → paper NAV / allocations / timeline on `/dashboard/following/[slug]`.
7. **Docs** → `#buildathon-demo` for architecture and API proof.

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
| `CRON_SECRET` | Protects `/api/cron/tick` and `/api/rebalance/run` (Vercel Cron) |
| `DATABASE_URL` | SQLite `file:./prisma/dev.db` |

See [docs/api-validation.md](docs/api-validation.md) and [.env.example](.env.example).

## Architecture

- **Frontend**: Next.js 15, Tailwind v4
- **Intelligence**: `src/lib/soso/` — 9 SoSoValue modules + signal provenance
- **AI**: `src/lib/ai/committee.ts` — multi-agent committee + risk engine
- **Execution**: `src/lib/sodex/client.ts` — testnet EIP-712 orders
- **Reconciliation**: `src/lib/sodex/reconcile.ts` — order polling + live NAV marks
- **Auth**: signed wallet sessions via `src/lib/auth/session.ts`
- **Data**: Prisma + SQLite

Built for the SoSoValue Buildathon — *One-Person Autonomous Financial Businesses*.
