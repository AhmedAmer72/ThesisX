import { describe, expect, it } from "vitest";
import { getSymbolId, listMappedSymbols } from "@/lib/sodex/symbols";

describe("SoDEX symbol mapping", () => {
  it("maps known symbols", () => {
    expect(getSymbolId("BTC")).toBe(1);
    expect(getSymbolId("eth")).toBe(2);
  });

  it("lists default symbols", () => {
    expect(listMappedSymbols()).toContain("BTC");
    expect(listMappedSymbols().length).toBeGreaterThan(5);
  });

  it("respects env override", () => {
    process.env.SODEX_SYMBOL_XYZ = "99";
    expect(getSymbolId("XYZ")).toBe(99);
    delete process.env.SODEX_SYMBOL_XYZ;
  });

  it("returns null for unknown symbols", () => {
    expect(getSymbolId("NOT_A_REAL_SYMBOL")).toBeNull();
  });
});
