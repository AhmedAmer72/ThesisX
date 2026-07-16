import { describe, expect, it } from "vitest";
import {
  BASE_PAPER_NAV,
  computePaperNav,
  computePnlPct,
  resolveFanoutNav,
} from "@/lib/copy-trading";
import type { MarketIntelligencePacket } from "@/lib/types";

describe("paper portfolio math", () => {
  it("scales paper NAV by mirror percentage", () => {
    expect(computePaperNav(100_000, 50)).toBe(50_000);
    expect(computePaperNav(100_000, 100)).toBe(100_000);
    expect(computePaperNav(null, 25)).toBe(BASE_PAPER_NAV * 0.25);
  });

  it("computes PnL vs entry", () => {
    expect(computePnlPct(50_000, 55_000)).toBeCloseTo(10, 5);
    expect(computePnlPct(50_000, 45_000)).toBeCloseTo(-10, 5);
    expect(computePnlPct(0, 10_000)).toBe(0);
  });

  it("resolveFanoutNav prefers positive leader/reconcile NAV", () => {
    const intel: MarketIntelligencePacket = {
      fetchedAt: new Date().toISOString(),
      demoMode: false,
      sources: [],
      moduleHealth: [],
      feeds: [],
      etf: [],
      indexes: [],
      macro: [],
      currencies: [
        { symbol: "BTC", name: "Bitcoin", price: 90000, change24h: 1 },
        { symbol: "ETH", name: "Ethereum", price: 3000, change24h: 1 },
      ],
      fundraising: [],
      btcTreasuries: [],
      cryptoStocks: [],
      charts: [],
      narratives: [],
      narrativeTags: [],
      topMovers: [],
      benchmarks: [],
      marketPulse: undefined,
    };
    const nav = resolveFanoutNav(
      [
        { symbol: "BTC", name: "Bitcoin", weight: 0.5 },
        { symbol: "ETH", name: "Ethereum", weight: 0.5 },
      ],
      120_000,
      intel
    );
    expect(nav).toBe(120_000);
  });

  it("falls back to BASE when leader nav missing", () => {
    expect(resolveFanoutNav([], 0, null)).toBe(BASE_PAPER_NAV);
  });
});
