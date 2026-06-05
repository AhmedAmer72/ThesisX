import type { TradeOrderPlan } from "@/lib/types";
import type { PositionRow } from "@/lib/portfolio/positions";

const STABLES = new Set(["USDC", "USDT", "DAI"]);

export function buildDeltaTradePlan(
  targetAllocations: { symbol: string; weight: number }[],
  positions: PositionRow[],
  options: {
    notionalUsd: number;
    prices: Record<string, number>;
    minTradeUsd?: number;
  }
): TradeOrderPlan[] {
  const { notionalUsd, prices, minTradeUsd = 25 } = options;
  const currentValue: Record<string, number> = {};
  let totalHeld = 0;

  for (const p of positions) {
    currentValue[p.symbol] = p.marketValueUsd;
    totalHeld += p.marketValueUsd;
  }

  const portfolioNav = Math.max(notionalUsd, totalHeld, 1);
  const orders: TradeOrderPlan[] = [];

  const targets = targetAllocations.filter(
    (a) => !STABLES.has(a.symbol.toUpperCase())
  );

  for (const target of targets) {
    const sym = target.symbol.toUpperCase();
    const px = prices[sym];
    if (!px || px <= 0) continue;

    const desiredUsd = target.weight * portfolioNav;
    const currentUsd = currentValue[sym] ?? 0;
    const deltaUsd = desiredUsd - currentUsd;

    if (Math.abs(deltaUsd) < minTradeUsd) continue;

    const qty = Math.abs(deltaUsd) / px;
    if (qty < 0.0000001) continue;

    orders.push({
      symbol: sym,
      side: deltaUsd > 0 ? "buy" : "sell",
      quantity: qty.toFixed(6),
      notionalUsd: Math.abs(deltaUsd),
    });
  }

  // Trim positions not in target
  const targetSet = new Set(targets.map((t) => t.symbol.toUpperCase()));
  for (const p of positions) {
    if (STABLES.has(p.symbol) || targetSet.has(p.symbol)) continue;
    if (p.marketValueUsd < minTradeUsd) continue;
    const px = prices[p.symbol] ?? p.lastPriceUsd;
    if (!px || px <= 0) continue;
    orders.push({
      symbol: p.symbol,
      side: "sell",
      quantity: p.quantity.toFixed(6),
      notionalUsd: p.marketValueUsd,
    });
  }

  return orders;
}
