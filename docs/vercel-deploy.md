# Deploy ThesisX on Vercel

Repository: [https://github.com/AhmedAmer72/ThesisX](https://github.com/AhmedAmer72/ThesisX)

## Operating mode: SoSo-first

Fund creation uses **live SoSoValue APIs** as the required data backbone. Portfolio generation runs through a **deterministic SoSo committee** by default. OpenAI is an **optional enhancement** for richer narratives — it is not required unless you set `OPENAI_REQUIRED=true`.

## Important: database

Vercel is serverless — **SQLite does not work** in production. Use a hosted PostgreSQL database.

### Recommended: Neon (free tier)

1. Create a project at [https://neon.tech](https://neon.tech)
2. Copy the connection string (starts with `postgresql://`)
3. Schema already uses PostgreSQL in `prisma/schema.prisma`
4. Locally run once:

```bash
npx prisma db push
```

## Deploy on Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import **AhmedAmer72/ThesisX** from GitHub
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables (Production):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL URL from Neon |
| `SOSOVALUE_API_KEY` | Yes | Live market intelligence |
| `WALLET_SESSION_SECRET` | Yes | Random 32+ char secret |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | From [Reown Cloud](https://cloud.reown.com) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your Vercel URL, e.g. `https://thesisx.vercel.app` |
| `EXECUTION_MODE` | Yes | `testnet` |
| `DEMO_MODE` | Yes | `false` |
| `OPENAI_REQUIRED` | Yes | `false` (SoSo-first default) |
| `OPENAI_API_KEY` | Optional | Only if you want AI-enhanced committee output |
| `OPENAI_MODEL` | Optional | `gpt-4o-mini` |
| `SODEX_API_KEY_NAME` | For execution | Required to approve/execute on testnet |
| `SODEX_API_PRIVATE_KEY` | For execution | Required to approve/execute on testnet |
| `SODEX_ACCOUNT_ID` | For execution | SoDEX testnet account |
| `SODEX_USER_ADDRESS` | For execution | Connected wallet address |
| `BUILDATHON_MODE` | Optional | `true` for strict live submission profile |
| `CRON_SECRET` | Optional | Random secret for cron routes |
| `REDIS_URL` | Optional | Upstash Redis REST URL |
| `REDIS_TOKEN` | Optional | Upstash token |

5. Click **Deploy**

## What blocks what

| Step | Required env |
|------|----------------|
| Fund creation | `SOSOVALUE_API_KEY`, `DATABASE_URL`, wallet connected |
| AI-enhanced committee | `OPENAI_API_KEY` (+ billing/quota on OpenAI account) |
| Strict OpenAI requirement | `OPENAI_REQUIRED=true` + `OPENAI_API_KEY` |
| Approve / execute trades | SoDEX credentials + `EXECUTION_MODE=testnet` |

## After first deploy

- Open `/settings` and confirm readiness checklist
- Run `npm run verify:soso` locally with the same API keys
- Set `CRON_SECRET` — `vercel.json` already schedules (Hobby: max once/day):
  - `GET /api/cron/tick` daily at 00:00 UTC (intel, alerts, weekly memos, reconcile, committee)
  - `GET /api/rebalance/run` daily at 12:00 UTC
  - `GET /api/rebalance/run` every 6 hours (cadence rebalance sweep)
- Manual tick: `curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_APP/api/cron/tick`

## WalletConnect

In Reown Cloud, add your Vercel domain to allowed origins.

## Troubleshooting fund creation

- **"OpenAI committee required but unavailable"** — set `OPENAI_REQUIRED=false` or add a valid `OPENAI_API_KEY`
- **"429 quota exceeded"** — OpenAI billing exhausted; with `OPENAI_REQUIRED=false` the app falls back to SoSo deterministic committee automatically
- **"Connect wallet before creating a fund"** — connect wallet on production before generating
