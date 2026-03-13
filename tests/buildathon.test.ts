import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getExecutionMode,
  getMinSosoModulesRequired,
  isBuildathonMode,
  isDemoPacketAllowed,
  isMockExecutionAllowed,
} from "@/lib/buildathon";
import { CORE_MODULES, FULL_MODULE_COUNT } from "@/lib/soso/endpoints";
import { requireSymbolId, getSymbolId } from "@/lib/sodex/symbols";
import { extractSignalsFromPacket } from "@/lib/soso/signals";
import { getDemoIntelligencePacket } from "@/lib/soso/demo-data";

describe("buildathon mode", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.BUILDATHON_MODE = "true";
    process.env.DEMO_MODE = "false";
    process.env.EXECUTION_MODE = "testnet";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("forces testnet execution", () => {
    expect(isBuildathonMode()).toBe(true);
    expect(getExecutionMode()).toBe("testnet");
    expect(isMockExecutionAllowed()).toBe(false);
    expect(isDemoPacketAllowed()).toBe(false);
    expect(getMinSosoModulesRequired()).toBeGreaterThanOrEqual(6);
  });

  it("includes all nine core modules for fund create", () => {
    expect(FULL_MODULE_COUNT).toBe(9);
    expect(CORE_MODULES).toContain("charts");
    expect(CORE_MODULES).toContain("etf");
  });

  it("blocks unmapped symbols", () => {
    expect(getSymbolId("UNKNOWN_ASSET")).toBeNull();
    expect(() => requireSymbolId("UNKNOWN_ASSET")).toThrow();
  });

  it("extracts signals from intelligence packet", () => {
    const demo = getDemoIntelligencePacket();
    const signals = extractSignalsFromPacket(demo);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].module).toBeTruthy();
  });
});
