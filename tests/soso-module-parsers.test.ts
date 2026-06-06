import { describe, expect, it } from "vitest";
import {
  applyFeeds,
  applyIndexes,
  applyFundraising,
  applyBtcTreasuries,
  applyCharts,
} from "@/lib/soso/module-parsers";
import { getDemoIntelligencePacket } from "@/lib/soso/demo-data";

describe("soso module parsers", () => {
  it("parses feeds from hot news shape", () => {
    const packet = getDemoIntelligencePacket();
    packet.feeds = [];
    applyFeeds(packet, {
      list: [
        { title: "Bitcoin Surges", content: "BTC up 5%" },
        { title: "ETH rally continues" },
      ],
    });
    expect(packet.feeds.length).toBe(2);
    expect(packet.feeds[0].title).toContain("Bitcoin");
  });

  it("parses SSI indexes", () => {
    const packet = getDemoIntelligencePacket();
    packet.indexes = [];
    applyIndexes(packet, [
      { index_name: "MAG7.ssi", change_percent: 2.5 },
      { name: "MEME.ssi", change24h: -1.2 },
    ]);
    expect(packet.indexes.length).toBe(2);
    expect(packet.indexes[0].name).toBe("MAG7.ssi");
  });

  it("parses fundraising projects", () => {
    const packet = getDemoIntelligencePacket();
    packet.fundraising = [];
    applyFundraising(packet, [
      { project_name: "Crossover Markets", amount: "$15M" },
    ]);
    expect(packet.fundraising[0].project).toBe("Crossover Markets");
  });

  it("parses BTC treasuries", () => {
    const packet = getDemoIntelligencePacket();
    packet.btcTreasuries = [];
    applyBtcTreasuries(packet, [
      { name: "MicroStrategy", btc_holdings: 500000 },
    ]);
    expect(packet.btcTreasuries[0].company).toBe("MicroStrategy");
    expect(packet.btcTreasuries[0].btcHoldings).toBe(500000);
  });

  it("parses analysis charts", () => {
    const packet = getDemoIntelligencePacket();
    packet.charts = [];
    applyCharts(packet, [{ chart_name: "etf-flow", title: "ETF Flow" }]);
    expect(packet.charts!.length).toBe(1);
    expect(packet.charts![0].title).toBe("ETF Flow");
  });
});
