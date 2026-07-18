# API Validation — ThesisX

Validated against official docs (Phase 0). Use `.env` for keys.

## SoSoValue OpenAPI

| Item | Value |
|------|--------|
| Base URL | `https://openapi.sosovalue.com/openapi/v1` |
| Auth header | `x-soso-api-key: <API_KEY>` |
| Docs | https://sosovalue-1.gitbook.io/sosovalue-api-doc |

### Modules → Client methods

| Module | Path (live) | Method | Purpose |
|--------|-------------|--------|---------|
| Currency | `/openapi/v1/data/default/coin/list` | POST | Asset universe |
| ETF | `/openapi/v2/etf/currentEtfDataMetrics` | POST | ETF flows (us-btc-spot, us-eth-spot, us-sol-spot) |
| Macro | `/openapi/v1/macro/events` | GET | Macro calendar |
| Crypto Stocks | `/openapi/v1/crypto-stocks/sectors` | GET | Sector performance |
| Feeds | `/openapi/v1/news/hot` | GET | Hot news clusters |
| SSI Index | `/openapi/v1/indices` | GET | SoSoValue index list |
| Fundraising | `/openapi/v1/fundraising/projects` | GET | Project fundraising list |
| BTC Treasuries | `/openapi/v1/btc-treasuries` | GET | Corporate BTC holders |
| Charts | `/openapi/v1/analyses` | GET | Analysis chart catalog |

Base host: `https://openapi.sosovalue.com`. Override paths via `SOSO_*_PATH` env vars. Health endpoint probes live when `GET /api/intelligence/health?live=true`.

### Operational rules

- Retry: 3 attempts with exponential backoff on 429/5xx
- Cache: Redis optional; MVP uses in-memory TTL (5 min default)
- Fallback: demo packet only when `DEMO_MODE=true` or `NODE_ENV=test`; with `DEMO_MODE=false` and a valid key, live data is required
- Verify: `npm run verify:soso`
- Buildathon: require ≥6 successful modules (override via `SOSO_MIN_MODULES_OK`)
- Fund create fetches all 9 core modules including Analysis Charts
- Rate limits: per GitBook — treat as soft limit; log `X-RateLimit-*` if present

## SoDEX

| Item | Testnet | Mainnet (gated) |
|------|---------|-----------------|
| Spot REST | `https://testnet-gw.sodex.dev/api/v1/spot` | `https://mainnet-gw.sodex.dev/api/v1/spot` |
| Perps REST | `https://testnet-gw.sodex.dev/api/v1/perps` | `https://mainnet-gw.sodex.dev/api/v1/perps` |
| Spot WS | `wss://testnet-gw.sodex.dev/ws/spot` | `wss://mainnet-gw.sodex.dev/ws/spot` |
| Docs | https://sodex.com/documentation/api/api | |

### Signing (validated)

- Trading: API key **name** in `X-API-Key`, EIP-712 signature in `X-API-Sign` (prefix `0x01`), nonce in `X-API-Nonce`
- `addAPIKey` / `revokeAPIKey`: master wallet only
- `payloadHash = keccak256(compact JSON { type, params })`
- Account ID: `GET .../accounts/{userAddress}/state` → `aid`

### MVP execution mode

- `EXECUTION_MODE=mock` — simulates fills (default for demo)
- `EXECUTION_MODE=testnet` — requires `SODEX_API_KEY_NAME`, `SODEX_API_PRIVATE_KEY`, `SODEX_ACCOUNT_ID` (primary account often `0`)
- Verify: `npm run verify:sodex`
- `POST /api/sodex/setup` key generation requires signed wallet session
- `EXECUTION_MODE=mainnet` — disabled unless `ALLOW_MAINNET=true`

## Environment checklist

```env
SOSOVALUE_API_KEY=
OPENAI_API_KEY=
DATABASE_URL=file:./prisma/dev.db
EXECUTION_MODE=mock
DEMO_MODE=true
```
