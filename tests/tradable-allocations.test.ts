import { describe, expect, it } from "vitest";
import {
  filterTradableAllocations,
  isTradableSymbol,
  isValidSymbolFormat,
} from "@/lib/sodex/tradable";
import { RISK_PRESETS } from "@/lib/risk/engine";
import type { Allocation } from "@/lib/types";

describe("tradable allocations", () => {
  const prices: Record<string, number> = {
    BTC: 90000,
    ETH: 3000,
    SOL: 150,
    USDC: 1,
  };

  it("rejects invalid symbol formats", () => {
    expect(isValidSymbolFormat("00")).toBe(false);
    expect(isValidSymbolFormat("???")).toBe(false);
    expect(isValidSymbolFormat("BTC")).toBe(true);
  });

  it("requires SoDEX mapping and live price", () => {
    expect(isTradableSymbol("BTC", prices)).toBe(true);
    expect(isTradableSymbol("LINK", prices)).toBe(false);
    expect(isTradableSymbol("BTC", {})).toBe(false);
    expect(isTradableSymbol("USDC", {})).toBe(true);
  });

  it("filters and renormalizes allocations", () => {
    const input: Allocation[] = [
      { symbol: "BTC", name: "Bitcoin", weight: 0.4, rationale: "core" },
      { symbol: "LINK", name: "Chainlink", weight: 0.3, rationale: "bad" },
      { symbol: "00", name: "Bad", weight: 0.2, rationale: "junk" },
      { symbol: "ETH", name: "Ethereum", weight: 0.1, rationale: "l1" },
    ];
    const out = filterTradableAllocations(
      input,
      prices,
      RISK_PRESETS.medium
    );
    const symbols = out.map((a) => a.symbol);
    expect(symbols).toContain("BTC");
    expect(symbols).toContain("ETH");
    expect(symbols).not.toContain("LINK");
    expect(symbols).not.toContain("00");
    expect(out.reduce((s, a) => s + a.weight, 0)).toBeCloseTo(1, 5);
  });
});
