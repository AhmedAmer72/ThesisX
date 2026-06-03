import type { Allocation, RiskCheckResult, RiskLevel } from "@/lib/types";

export interface RiskLimits {
  maxPositionPct: number;
  maxSectorPct: number;
  maxAssets: number;
  maxDrawdownPct: number;
  minStableReserve: number;
}

export const RISK_PRESETS: Record<RiskLevel, RiskLimits> = {
  low: {
    maxPositionPct: 0.2,
    maxSectorPct: 0.4,
    maxAssets: 5,
    maxDrawdownPct: 0.08,
    minStableReserve: 0.25,
  },
  medium: {
    maxPositionPct: 0.3,
    maxSectorPct: 0.5,
    maxAssets: 7,
    maxDrawdownPct: 0.15,
    minStableReserve: 0.15,
  },
  high: {
    maxPositionPct: 0.4,
    maxSectorPct: 0.6,
    maxAssets: 8,
    maxDrawdownPct: 0.22,
    minStableReserve: 0.1,
  },
  aggressive: {
    maxPositionPct: 0.5,
    maxSectorPct: 0.7,
    maxAssets: 10,
    maxDrawdownPct: 0.3,
    minStableReserve: 0.05,
  },
};

export function inferRiskLevel(prompt: string): RiskLevel {
  const p = prompt.toLowerCase();
  if (p.includes("low-risk") || p.includes("low risk") || p.includes("conservative"))
    return "low";
  if (p.includes("aggressive") || p.includes("high-risk") || p.includes("high risk"))
    return "aggressive";
  if (p.includes("medium")) return "medium";
  return "medium";
}

export function normalizeAllocations(
  allocations: Allocation[],
  limits: RiskLimits
): Allocation[] {
  let items = allocations.slice(0, limits.maxAssets);
  const total = items.reduce((s, a) => s + a.weight, 0) || 1;
  items = items.map((a) => ({
    ...a,
    weight: Math.min(a.weight / total, limits.maxPositionPct),
  }));
  const sum = items.reduce((s, a) => s + a.weight, 0);
  if (sum < 1 - limits.minStableReserve) {
    items.push({
      symbol: "USDC",
      name: "USD Coin",
      weight: 1 - sum,
      sector: "Cash",
      rationale: "Risk reserve per policy",
    });
  }
  const reTotal = items.reduce((s, a) => s + a.weight, 0) || 1;
  return items.map((a) => ({ ...a, weight: a.weight / reTotal }));
}

export function runRiskChecks(
  allocations: Allocation[],
  limits: RiskLimits,
  excluded: string[] = []
): RiskCheckResult[] {
  const checks: RiskCheckResult[] = [];

  const maxPos = Math.max(...allocations.map((a) => a.weight), 0);
  checks.push({
    name: "max_position",
    passed: maxPos <= limits.maxPositionPct + 0.01,
    message: `Largest position ${(maxPos * 100).toFixed(1)}% (max ${limits.maxPositionPct * 100}%)`,
  });

  const sectorMap = new Map<string, number>();
  for (const a of allocations) {
    const sec = a.sector ?? "Other";
    sectorMap.set(sec, (sectorMap.get(sec) ?? 0) + a.weight);
  }
  const maxSector = Math.max(...sectorMap.values(), 0);
  checks.push({
    name: "max_sector",
    passed: maxSector <= limits.maxSectorPct + 0.01,
    message: `Largest sector ${(maxSector * 100).toFixed(1)}% (max ${limits.maxSectorPct * 100}%)`,
  });

  checks.push({
    name: "asset_count",
    passed: allocations.length <= limits.maxAssets,
    message: `${allocations.length} assets (max ${limits.maxAssets})`,
  });

  const stable = allocations
    .filter((a) => ["USDC", "USDT", "DAI"].includes(a.symbol))
    .reduce((s, a) => s + a.weight, 0);
  checks.push({
    name: "stable_reserve",
    passed: stable >= limits.minStableReserve - 0.01,
    message: `Stable reserve ${(stable * 100).toFixed(1)}% (min ${limits.minStableReserve * 100}%)`,
  });

  for (const sym of excluded) {
    const hit = allocations.some(
      (a) => a.symbol.toUpperCase() === sym.toUpperCase()
    );
    if (hit) {
      checks.push({
        name: "excluded_asset",
        passed: false,
        message: `Excluded asset present: ${sym}`,
      });
    }
  }

  if (!checks.some((c) => c.name === "excluded_asset")) {
    checks.push({
      name: "excluded_asset",
      passed: true,
      message: "No excluded assets in portfolio",
    });
  }

  return checks;
}

export function allChecksPassed(checks: RiskCheckResult[]): boolean {
  return checks.every((c) => c.passed);
}
