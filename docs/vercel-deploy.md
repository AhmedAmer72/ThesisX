# Deploy ThesisX on Vercel

Repository: [https://github.com/AhmedAmer72/ThesisX](https://github.com/AhmedAmer72/ThesisX)

## Important: database

Vercel is serverless — **SQLite does not work** in production. Use a hosted PostgreSQL database.

### Recommended: Neon (free tier)

1. Create a project at [https://neon.tech](https://neon.tech)
2. Copy the connection string (starts with `postgresql://`)
3. In `prisma/schema.prisma`, change the datasource provider:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

4. Locally run once:

```bash
npx prisma db push
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial ThesisX production release"
git branch -M main
git remote add origin https://github.com/AhmedAmer72/ThesisX.git
git push -u origin main
```

## Deploy on Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import **AhmedAmer72/ThesisX** from GitHub
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables (Production):

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | PostgreSQL URL from Neon |
| `SOSOVALUE_API_KEY` | Yes |
| `OPENAI_API_KEY` | Yes |
| `WALLET_SESSION_SECRET` | Random 32+ char secret |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From [Reown Cloud](https://cloud.reown.com) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL, e.g. `https://thesisx.vercel.app` |
| `EXECUTION_MODE` | `testnet` |
| `BUILDATHON_MODE` | `true` (optional, strict live mode) |
| `DEMO_MODE` | `false` |
| `SODEX_API_KEY_NAME` | SoDEX testnet |
| `SODEX_API_PRIVATE_KEY` | SoDEX testnet |
| `SODEX_ACCOUNT_ID` | SoDEX testnet |
| `SODEX_USER_ADDRESS` | Your wallet |
| `CRON_SECRET` | Random secret for cron routes |
| `REDIS_URL` | Optional (Upstash Redis REST URL) |
| `REDIS_TOKEN` | Optional (Upstash token) |

5. Click **Deploy**

## After first deploy

- Open `/settings` and confirm readiness checklist
- Run `npm run verify:soso` locally with the same API keys
- Add Vercel Cron (optional) for `/api/rebalance/run` with header `Authorization: Bearer <CRON_SECRET>`

## WalletConnect

In Reown Cloud, add your Vercel domain to allowed origins.
