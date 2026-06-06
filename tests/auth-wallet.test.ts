import { describe, expect, it } from "vitest";
import { isValidAddress } from "@/lib/wallet/utils";
import { flagsForPlan, parseFeatureFlags } from "@/lib/entitlements";

describe("wallet auth helpers", () => {
  it("validates ethereum addresses", () => {
    expect(isValidAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")).toBe(
      false
    );
    expect(
      isValidAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0")
    ).toBe(true);
  });

  it("returns MVP free flags for free plan", () => {
    const flags = flagsForPlan("free");
    expect(flags).toContain("copy_trading");
    expect(flags).toContain("weekly_reports");
  });

  it("parses feature flags json", () => {
    expect(parseFeatureFlags('["copy_trading","alerts"]')).toEqual([
      "copy_trading",
      "alerts",
    ]);
    expect(parseFeatureFlags("invalid")).toEqual([]);
  });
});
