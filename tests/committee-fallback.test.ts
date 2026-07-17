import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { MarketIntelligencePacket } from "@/lib/types";

const mockCreate = vi.fn().mockResolvedValue({ id: "run-1" });

vi.mock("@/lib/db", () => ({
  prisma: {
    aiRun: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: vi.fn().mockRejectedValue(
          new Error("429 You exceeded your current quota, please check your plan")
        ),
      },
    };
  },
}));

function sampleIntel(): MarketIntelligencePacket {
  return {
    fetchedAt: new Date().toISOString(),
    demoMode: false,
    sources: [{ module: "currency", endpoint: "/c", label: "Currency", fetchedAt: new Date().toISOString() }],
    moduleHealth: [],
    feeds: [{ title: "BTC rally", sentiment: "bullish", source: "SoSo" }],
    etf: [{ name: "BTC ETF", changePct: 1.2 }],
    indexes: [{ name: "SSI AI", changePct: 2.1, sector: "AI" }],
    macro: [],
    currencies: [
      { symbol: "BTC", name: "Bitcoin", price: 90000, change24h: 2 },
      { symbol: "ETH", name: "Ethereum", price: 3000, change24h: 1.5 },
      { symbol: "SOL", name: "Solana", price: 150, change24h: 3 },
    ],
    fundraising: [],
    btcTreasuries: [],
    cryptoStocks: [],
    charts: [],
    narratives: ["AI infrastructure momentum"],
    narrativeTags: [],
    topMovers: [{ symbol: "SOL", change24h: 3 }],
    benchmarks: [],
    marketPulse: {
      riskOnScore: 72,
      etfInflowCount: 1,
      bullishHeadlines: 1,
      indexesPositive: 1,
    },
  };
}

describe("committee fallback", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    mockCreate.mockClear();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_REQUIRED = "false";
    process.env.PRODUCTION_MODE = "true";
  });

  afterEach(() => {
    process.env = { ...prev };
    vi.resetModules();
  });

  it("falls back to deterministic SoSo committee when OpenAI quota is exceeded", async () => {
    const { runInvestmentCommittee } = await import("@/lib/ai/committee");
    const out = await runInvestmentCommittee(
      "Build a medium-risk AI infrastructure fund",
      sampleIntel(),
      { riskLevel: "medium" }
    );

    expect(out.meta.mode).toBe("deterministic");
    expect(out.meta.fallbackReason).toBe("quota_exceeded");
    expect(out.result.allocations.length).toBeGreaterThan(0);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].data.status).toBe("quota_exceeded");
    expect(mockCreate.mock.calls[0][0].data.model).toBe("soso-deterministic");
  });
});
