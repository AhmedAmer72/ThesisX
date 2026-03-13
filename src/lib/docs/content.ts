export type DocSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: { title: string; body: string[] }[];
};

export const docSections: DocSection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "ThesisX is an AI-native operating system for on-chain finance. You describe an investment thesis in plain language; the platform pulls live market intelligence from SoSoValue, runs a multi-agent investment committee, applies risk checks, and prepares execution on SoDEX — with your explicit approval at every critical step.",
      "MVP scope covers the full product loop: signed wallet auth, fund creation, SoSo signal-to-allocation mapping, intelligence dashboards, rebalance proposals, watchlist mirroring, weekly reports, and alerts. Buildathon mode enforces live SoSoValue data and SoDEX testnet execution.",
    ],
  },
  {
    id: "how-it-works",
    title: "How it works",
    bullets: [
      "Connect your wallet — creates or resumes your ThesisX user account.",
      "Create a fund — describe strategy, risk, and rebalance cadence.",
      "SoSoValue intelligence — nine live modules feed the committee (ETF, macro, feeds, indexes, etc.).",
      "AI committee — six agents vote on thesis, allocations, and execution recommendation.",
      "Approve execution — you accept risk disclosure before any trade plan runs.",
      "Monitor & rebalance — dashboard shows SoSo widgets; approve new rebalance proposals.",
      "Follow & copy — mirror public funds in a paper portfolio (no capital at risk).",
    ],
  },
  {
    id: "wallet",
    title: "Wallet & accounts",
    paragraphs: [
      "ThesisX uses RainbowKit + wagmi for wallet connection. Your address is persisted via POST /api/wallet/connect and becomes your user identity.",
      "Funds you create while connected are linked to your wallet (userId). Only the owner can approve execution, propose/approve rebalances, refresh private intelligence, or toggle the fund kill switch.",
    ],
    bullets: [
      "Default network: ValueChain Testnet (chain ID 138565).",
      "Dashboard (/dashboard): created funds, follows, pending rebalances, alerts, recent AI actions.",
      "API requests from the browser send x-wallet-address header for ownership checks.",
    ],
  },
  {
    id: "create-fund",
    title: "Creating a fund",
    paragraphs: [
      "Go to Create (/create) and describe your fund in natural language — e.g. sector focus, risk appetite, weekly vs daily rebalance.",
    ],
    bullets: [
      "Risk levels: low, medium, high, aggressive (presets cap position size, sector exposure, max assets, drawdown).",
      "Optional excluded assets (e.g. DOGE, USDT).",
      "Output: fund slug, thesis summary, allocations, agent votes, pending trade intent.",
      "Status starts as pending_review until you approve with disclosureAccepted: true.",
    ],
  },
  {
    id: "intelligence",
    title: "SoSoValue intelligence",
    paragraphs: [
      "Intelligence is assembled into a MarketIntelligencePacket used by the committee, dashboards, and weekly reports.",
    ],
    subsections: [
      {
        title: "Live modules",
        body: [
          "Currency — listed assets and 24h movers",
          "ETF — BTC/ETH/SOL spot ETF flow metrics",
          "Macro — economic calendar events",
          "Crypto stocks — sector performance",
          "Feeds — hot news clusters",
          "SSI indexes — SoSoValue index list",
          "Fundraising — project fundraising activity",
          "BTC treasuries — corporate BTC holdings",
          "Charts — analysis chart catalog",
        ],
      },
      {
        title: "Health & refresh",
        body: [
          "Settings → probe live endpoints at GET /api/intelligence/health?live=true",
          "Per-fund: GET /api/funds/[slug]/intelligence?refresh=true",
          "Accept a live refresh to persist snapshot to FundThesis.intelPacketJson (owner only)",
        ],
      },
    ],
  },
  {
    id: "committee",
    title: "AI investment committee",
    paragraphs: [
      "Six agents (Macro, Narrative, Momentum, Treasury, Risk, Allocation) review the intelligence packet and your prompt. OpenAI generates structured JSON: thesis, allocations, votes, confidence, and execute | hold | reduce recommendation.",
      "Risk engine validates allocations against your policy before a trade intent is created.",
    ],
  },
  {
    id: "execution",
    title: "Approval & execution",
    bullets: [
      "POST /api/funds/[slug]/approve — requires wallet ownership + disclosureAccepted: true",
      "Global and per-fund kill switches block execution (Settings)",
      "EXECUTION_MODE: mock (default), testnet, or mainnet (gated by ALLOW_MAINNET)",
      "SoDEX testnet: https://testnet-gw.sodex.dev — requires API key, private key, account ID",
    ],
  },
  {
    id: "rebalance",
    title: "Rebalancing",
    paragraphs: [
      "Active funds can receive SoSo-powered rebalance proposals on a daily or weekly cadence.",
    ],
    bullets: [
      "Manual: Dashboard → Propose rebalance → review allocations → Approve or Reject",
      "Cron: POST /api/rebalance/run (optional CRON_SECRET) for eligible active funds",
      "Each proposal creates a RebalanceRun + TradeIntent in pending_review",
      "Execution still requires owner approval and risk disclosure",
    ],
  },
  {
    id: "copy-trading",
    title: "Paper copy-trading",
    paragraphs: [
      "Follow any public fund from the marketplace or fund page. ThesisX mirrors allocations into a paper follower portfolio — no on-chain deposits in MVP.",
    ],
    bullets: [
      "POST /api/copy — follow, unfollow, allocation percentage",
      "FollowerSnapshot records created on fund execution and rebalance fanout",
      "View follows on /dashboard under Following (paper)",
    ],
  },
  {
    id: "reports",
    title: "Reports & alerts",
    bullets: [
      "Weekly memos: GET /api/reports/weekly?slug=... — persisted as FundReport",
      "Alerts: ETF outflows, macro events, index drawdowns, BTC treasury activity, fundraising surges",
      "Notifications appear on /dashboard; PATCH /api/notifications to mark read",
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace & public funds",
    paragraphs: [
      "Browse public funds at /marketplace. Each fund has a public page at /funds/[slug] with thesis, allocations, agent votes, and follow button.",
      "Fund owners use /dashboard/[slug] for private controls and SoSo widgets.",
    ],
  },
  {
    id: "settings",
    title: "Settings & configuration",
    bullets: [
      "SOSOVALUE_API_KEY — required for live intelligence (Settings health panel)",
      "OPENAI_API_KEY — committee generation",
      "DATABASE_URL — SQLite by default (prisma/dev.db)",
      "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID — RainbowKit",
      "DEMO_MODE=false — enforces live SoSo data when key is set",
      "EXECUTION_MODE=mock — safe default for development",
    ],
  },
  {
    id: "api",
    title: "API reference (MVP)",
    subsections: [
      {
        title: "Core routes",
        body: [
          "POST /api/wallet/connect — upsert user by address",
          "GET /api/me/funds — dashboard index (wallet header)",
          "POST /api/funds — create fund from prompt",
          "POST /api/funds/[slug]/approve — execute pending intent",
          "POST /api/funds/[slug]/rebalance — propose | approve | reject",
          "GET/POST /api/funds/[slug]/intelligence — snapshot & live refresh",
          "POST /api/copy — follow / unfollow",
          "GET /api/intelligence/health — module reachability",
          "GET /api/sodex/test — SoDEX account id + API key registration",
          "GET /api/reports/weekly — weekly memo + history",
          "GET /api/entitlements — MVP feature flags",
        ],
      },
    ],
  },
  {
    id: "buildathon-demo",
    title: "Buildathon demo path",
    paragraphs: [
      "Use this exact flow for a five-minute judge review. Set BUILDATHON_MODE=true, DEMO_MODE=false, EXECUTION_MODE=testnet, and configure SoSoValue + SoDEX credentials in Settings.",
    ],
    bullets: [
      "1. Landing (/) — Market Pulse widget shows live SoSoValue packet",
      "2. Settings (/settings) — readiness checklist, module health, Test SoDEX connection",
      "3. Create (/create?prompt=...) — connect wallet, pick ETF Flow or SSI preset, review signal map",
      "4. Approve — explicit disclosure + wallet signature; SoDEX testnet order IDs (not mock-*)",
      "5. Dashboard (/dashboard/[slug]) — pending execution panel, order refs, intelligence refresh, rebalance",
      "6. Marketplace (/marketplace) — filter by SoSo module, open public fund transparency page",
      "7. Docs (/docs#api) — API reference and safety controls",
    ],
  },
  {
    id: "safety",
    title: "Safety & risk",
    paragraphs: [
      "ThesisX is experimental software. AI-generated allocations are not financial advice. Buildathon mode uses live SoSoValue intelligence and SoDEX testnet signing with your keys.",
      "Always review agent votes, risk checks, and allocations before approving. Use kill switches if you need to halt automation.",
    ],
    bullets: [
      "Read /legal/disclosures before approving execution",
      "Never commit .env secrets to version control",
      "Mainnet execution disabled unless ALLOW_MAINNET=true",
    ],
  },
];

export const docNav = docSections.map((s) => ({ id: s.id, title: s.title }));
