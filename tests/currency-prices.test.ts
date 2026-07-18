import { describe, expect, it, vi, afterEach } from "vitest";
import { attachMarketPricesToCoinList } from "@/lib/soso/currency-prices";
import { applyCurrency } from "@/lib/soso/module-parsers";
import type { MarketIntelligencePacket } from "@/lib/types";
import { priceMapFromIntel } from "@/lib/portfolio/mark-to-market";
import { getTradableCurrencySymbols } from "@/lib/sodex/tradable";

function emptyPacket(): MarketIntelligencePacket {
  return {
    fetchedAt: new Date().toISOString(),
    demoMode: false,
    sources: [],
    feeds: [],
    etf: [],
    indexes: [],
    macro: [],
    currencies: [],
    fundraising: [],
    btcTreasuries: [],
    cryptoStocks: [],
    narratives: [],
  };
}

describe("attachMarketPricesToCoinList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SOSOVALUE_API_KEY;
  });

  it("attaches live prices from market-snapshot and aliases RENDER→RNDR", async () => {
    process.env.SOSOVALUE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes("/currencies/111/market-snapshot")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                data: { price: 65000, change_pct_24h: 0.01 },
              }),
          };
        }
        if (u.includes("/currencies/222/market-snapshot")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                data: { price: 3200, change_pct_24h: -0.02 },
              }),
          };
        }
        if (u.includes("/currencies/333/market-snapshot")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                data: { price: 8.5, change_pct_24h: 0.05 },
              }),
          };
        }
        return { ok: false, status: 404, text: async () => "{}" };
      })
    );

    const priced = await attachMarketPricesToCoinList([
      { currencyName: "btc", fullName: "Bitcoin", currencyId: "111" },
      { currencyName: "eth", fullName: "Ethereum", currencyId: "222" },
      { currencyName: "RENDER", fullName: "Render", currencyId: "333" },
      { currencyName: "doge", fullName: "Dogecoin", currencyId: "999" },
    ]);

    const packet = emptyPacket();
    applyCurrency(packet, priced);

    const prices = priceMapFromIntel(packet);
    expect(prices.BTC).toBe(65000);
    expect(prices.ETH).toBe(3200);
    expect(prices.RNDR).toBe(8.5);
    expect(packet.currencies.find((c) => c.symbol === "RNDR")?.change24h).toBe(
      5
    );

    const tradable = getTradableCurrencySymbols(packet);
    expect(tradable).toEqual(expect.arrayContaining(["BTC", "ETH", "RNDR"]));
  });
});
