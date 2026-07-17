import { describe, expect, it } from "vitest";
import { buildWeeklyReport } from "@/lib/soso/weekly-report";
import type { MarketIntelligencePacket } from "@/lib/types";

function sampleIntel(): MarketIntelligencePacket {
  return {
    fetchedAt: new Date().toISOString(),
    demoMode: false,
    sources: [],
    moduleHealth: [],
    feeds: [],
    etf: [{ name: "IBIT", flow: "+10", changePct: 1 }],
    indexes: [{ name: "SSI AI", changePct: 2 }],
    macro: [],
    currencies: [],
    fundraising: [],
    btcTreasuries: [],
    cryptoStocks: [],
    charts: [],
    narratives: ["AI infra"],
    narrativeTags: [],
    topMovers: [{ symbol: "ETH", change24h: 2 }],
    benchmarks: [],
    marketPulse: {
      riskOnScore: 70,
      etfInflowCount: 1,
      bullishHeadlines: 1,
      indexesPositive: 1,
      topHeadline: "Test",
    },
  };
}

describe("weekly research desk", () => {
  it("uses ISO week period keys for archive uniqueness", async () => {
    const report = await buildWeeklyReport({
      fundName: "Test Fund",
      riskLevel: "medium",
      rebalanceCadence: "weekly",
      thesisSummary: "Summary",
      thesisOutlook: "Outlook",
      snapshot: sampleIntel(),
    });
    expect(report.period).toMatch(/^week-\d{4}-\d{2}-\d{2}$/);
    expect(report.liveIntelligence).toBe(true);
    expect(report.fundName).toBe("Test Fund");
  });
});
