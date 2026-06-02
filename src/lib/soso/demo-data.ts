import type { MarketIntelligencePacket } from "@/lib/types";
import { buildNarratives, computeTopMovers, computeMarketPulse } from "@/lib/soso/modules";

export function getDemoIntelligencePacket(): MarketIntelligencePacket {
  const now = new Date().toISOString();
  const packet: MarketIntelligencePacket = {
    fetchedAt: now,
    demoMode: true,
    sources: [
      {
        module: "demo",
        endpoint: "seed",
        label: "Demo Intelligence Packet",
        fetchedAt: now,
        cacheHit: false,
      },
    ],
    moduleHealth: [
      {
        module: "demo",
        label: "Demo Intelligence Packet",
        endpoint: "seed",
        status: "ok",
        fetchedAt: now,
        cacheHit: false,
      },
    ],
    feeds: [
      {
        title: "AI infrastructure tokens rally on datacenter capex guidance",
        sentiment: "bullish",
      },
      {
        title: "Ethereum L2 fees compress as blob usage scales",
        sentiment: "neutral",
      },
      {
        title: "Spot BTC ETF sees third-largest weekly inflow YTD",
        sentiment: "bullish",
      },
    ],
    etf: [
      { name: "IBIT", flow: "+$420M", changePct: 1.2 },
      { name: "ETHA", flow: "+$85M", changePct: 0.8 },
    ],
    indexes: [
      { name: "SSI AI", changePct: 4.2, sector: "AI" },
      { name: "SSI DePIN", changePct: 2.1, sector: "Infrastructure" },
      { name: "SSI L2", changePct: 1.5, sector: "Infrastructure" },
    ],
    macro: [
      {
        event: "FOMC minutes",
        date: "2026-06-02",
        impact: "risk-on if dovish",
      },
      { event: "US CPI print", date: "2026-06-10", impact: "volatility" },
    ],
    currencies: [
      { symbol: "ETH", name: "Ethereum", price: 3800, change24h: 2.4 },
      { symbol: "SOL", name: "Solana", price: 185, change24h: 3.1 },
      { symbol: "RNDR", name: "Render", price: 9.2, change24h: 5.8 },
      { symbol: "TAO", name: "Bittensor", price: 420, change24h: 4.1 },
      { symbol: "AKT", name: "Akash", price: 4.5, change24h: 3.2 },
      { symbol: "AR", name: "Arweave", price: 28, change24h: 2.0 },
      { symbol: "USDC", name: "USD Coin", price: 1, change24h: 0 },
    ],
    fundraising: [
      { project: "Modular DA rollup", amount: "$45M", sector: "Infrastructure" },
      { project: "Agent payments rail", amount: "$12M", sector: "AI" },
    ],
    btcTreasuries: [
      { company: "MicroStrategy", btcHoldings: 528000 },
      { company: "Metaplanet", btcHoldings: 8500 },
    ],
    cryptoStocks: [
      { ticker: "AI_INFRA", sector: "AI Infrastructure", changePct: 3.4 },
      { ticker: "DEPIN", sector: "DePIN", changePct: 2.8 },
    ],
    charts: [
      { id: "demo-etf-flow", title: "ETF Net Flows", category: "ETF" },
      { id: "demo-ssi-ai", title: "SSI AI Index", category: "Index" },
    ],
    narratives: [],
    narrativeTags: [],
    topMovers: [],
    benchmarks: [],
    marketPulse: {
      riskOnScore: 0,
      etfInflowCount: 0,
      bullishHeadlines: 0,
      indexesPositive: 0,
    },
  };
  packet.narratives = buildNarratives(packet);
  packet.narrativeTags = [...packet.narratives];
  packet.topMovers = computeTopMovers(packet);
  packet.benchmarks = packet.indexes.map((i) => ({
    name: i.name,
    changePct: i.changePct,
    sector: i.sector,
  }));
  packet.marketPulse = computeMarketPulse(packet);
  return packet;
}
