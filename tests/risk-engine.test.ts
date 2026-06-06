import { describe, expect, it } from "vitest";
import {
  RISK_PRESETS,
  runRiskChecks,
  allChecksPassed,
  inferRiskLevel,
} from "@/lib/risk/engine";

describe("risk engine", () => {
  it("infers risk level from prompt", () => {
    expect(inferRiskLevel("low-risk conservative fund")).toBe("low");
    expect(inferRiskLevel("aggressive high-risk fund")).toBe("aggressive");
  });

  it("passes checks for balanced allocations", () => {
    const limits = RISK_PRESETS.medium;
    const allocations = [
      { symbol: "ETH", name: "Ethereum", weight: 0.2, sector: "L1" },
      { symbol: "SOL", name: "Solana", weight: 0.2, sector: "L1" },
      { symbol: "RNDR", name: "Render", weight: 0.2, sector: "AI" },
      { symbol: "TAO", name: "Bittensor", weight: 0.2, sector: "AI" },
      { symbol: "USDC", name: "USD Coin", weight: 0.2, sector: "Cash" },
    ];
    const checks = runRiskChecks(allocations, limits);
    expect(checks.filter((c) => !c.passed)).toEqual([]);
  });

  it("fails when excluded asset is present", () => {
    const limits = RISK_PRESETS.medium;
    const allocations = [
      { symbol: "DOGE", name: "Dogecoin", weight: 0.5, sector: "Meme" },
      { symbol: "USDC", name: "USD Coin", weight: 0.5, sector: "Cash" },
    ];
    const checks = runRiskChecks(allocations, limits, ["DOGE"]);
    expect(allChecksPassed(checks)).toBe(false);
  });
});
