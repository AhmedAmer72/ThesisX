import type { Allocation, MarketIntelligencePacket } from "@/lib/types";

const STABLES = new Set(["USDC", "USDT", "DAI"]);

export function priceMapFromIntel(
  intel: MarketIntelligencePacket
): Record<string, number> {
  const map: Record<string, number> = {
    USDC: 1,
    USDT: 1,
    DAI: 1,
  };
  for (const c of intel.currencies) {
    if (c.symbol && c.price && c.price > 0) {
      map[c.symbol.toUpperCase()] = c.price;
    }
  }
  return map;
}

export function computeNavFromAllocations(
  allocations: Allocation[],
  prices: Record<string, number>,
  baseNav = 100_000,
  entryPrices?: Record<string, number>
): number {
  let nav = 0;
  for (const a of allocations) {
    const sym = a.symbol.toUpperCase();
    const px = prices[sym];
    if (!px || px <= 0) {
      if (STABLES.has(sym)) {
        nav += baseNav * a.weight;
      }
      continue;
    }
    const change = pricesChangeProxy(a, prices, entryPrices) ?? 0;
    nav += baseNav * a.weight * (1 + change);
  }
  if (nav <= 0) return baseNav;
  return nav;
}

function pricesChangeProxy(
  alloc: Allocation,
  prices: Record<string, number>,
  entryPrices?: Record<string, number>
): number | null {
  const sym = alloc.symbol.toUpperCase();
  const px = prices[sym];
  if (!px || px <= 0) return null;
  const entry = entryPrices?.[sym];
  if (!entry || entry <= 0) return 0;
  return (px - entry) / entry;
}

export function computeNavFromPositions(
  positions: {
    quantity: number;
    lastPriceUsd: number;
    marketValueUsd?: number;
  }[],
  cashUsd = 0
): number {
  const holdings = positions.reduce(
    (s, p) => s + (p.marketValueUsd ?? p.quantity * p.lastPriceUsd),
    0
  );
  return holdings + cashUsd;
}

export function computePerformanceMetrics(
  nav: number,
  baselineNav = 100_000,
  priorNav?: number
): { pnlPct: number; drawdownPct: number; weeklyReturnPct?: number } {
  const pnlPct = ((nav - baselineNav) / baselineNav) * 100;
  const drawdownPct = nav < baselineNav ? ((baselineNav - nav) / baselineNav) * 100 : 0;
  const weeklyReturnPct =
    priorNav && priorNav > 0 ? ((nav - priorNav) / priorNav) * 100 : undefined;
  return { pnlPct, drawdownPct, weeklyReturnPct };
}
