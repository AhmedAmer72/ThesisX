import { prisma } from "@/lib/db";
import type { Allocation, MarketIntelligencePacket } from "@/lib/types";
import {
  computePerformanceMetrics,
  priceMapFromIntel,
} from "@/lib/portfolio/mark-to-market";

export type PositionRow = {
  symbol: string;
  quantity: number;
  avgCostUsd: number;
  lastPriceUsd: number;
  marketValueUsd: number;
  unrealizedPnl: number;
};

export async function getFundPositions(fundId: string): Promise<PositionRow[]> {
  const rows = await prisma.position.findMany({
    where: { fundId },
    orderBy: { marketValueUsd: "desc" },
  });
  return rows.map((r) => ({
    symbol: r.symbol,
    quantity: r.quantity,
    avgCostUsd: r.avgCostUsd,
    lastPriceUsd: r.lastPriceUsd ?? r.avgCostUsd,
    marketValueUsd: r.marketValueUsd,
    unrealizedPnl: r.unrealizedPnl,
  }));
}

export async function applyFillToPositions(
  fundId: string,
  symbol: string,
  side: "buy" | "sell",
  quantity: number,
  fillPriceUsd: number
): Promise<void> {
  const sym = symbol.toUpperCase();
  const existing = await prisma.position.findUnique({
    where: { fundId_symbol: { fundId, symbol: sym } },
  });

  if (side === "buy") {
    const prevQty = existing?.quantity ?? 0;
    const prevCost = existing?.avgCostUsd ?? 0;
    const newQty = prevQty + quantity;
    const avgCost =
      newQty > 0
        ? (prevQty * prevCost + quantity * fillPriceUsd) / newQty
        : fillPriceUsd;
    const marketValue = newQty * fillPriceUsd;
    await prisma.position.upsert({
      where: { fundId_symbol: { fundId, symbol: sym } },
      create: {
        fundId,
        symbol: sym,
        quantity: newQty,
        avgCostUsd: avgCost,
        lastPriceUsd: fillPriceUsd,
        marketValueUsd: marketValue,
        unrealizedPnl: marketValue - newQty * avgCost,
      },
      update: {
        quantity: newQty,
        avgCostUsd: avgCost,
        lastPriceUsd: fillPriceUsd,
        marketValueUsd: marketValue,
        unrealizedPnl: marketValue - newQty * avgCost,
      },
    });
    return;
  }

  if (!existing || existing.quantity <= 0) return;
  const sellQty = Math.min(quantity, existing.quantity);
  const newQty = existing.quantity - sellQty;
  const lastPrice = fillPriceUsd;
  if (newQty <= 0) {
    await prisma.position.delete({
      where: { fundId_symbol: { fundId, symbol: sym } },
    });
    return;
  }
  const marketValue = newQty * lastPrice;
  await prisma.position.update({
    where: { fundId_symbol: { fundId, symbol: sym } },
    data: {
      quantity: newQty,
      lastPriceUsd: lastPrice,
      marketValueUsd: marketValue,
      unrealizedPnl: marketValue - newQty * existing.avgCostUsd,
    },
  });
}

export async function markPositionsFromIntel(
  fundId: string,
  intel: MarketIntelligencePacket
): Promise<number> {
  const prices = priceMapFromIntel(intel);
  const positions = await prisma.position.findMany({ where: { fundId } });
  let nav = 0;

  for (const pos of positions) {
    const px = prices[pos.symbol] ?? pos.lastPriceUsd ?? pos.avgCostUsd;
    const marketValue = pos.quantity * px;
    const unrealized = marketValue - pos.quantity * pos.avgCostUsd;
    await prisma.position.update({
      where: { id: pos.id },
      data: {
        lastPriceUsd: px,
        marketValueUsd: marketValue,
        unrealizedPnl: unrealized,
      },
    });
    nav += marketValue;
  }

  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: { fundId },
    orderBy: { createdAt: "desc" },
  });
  const cashWeight = snapshot
    ? (
        JSON.parse(snapshot.allocationsJson) as Allocation[]
      ).find((a) => ["USDC", "USDT", "DAI"].includes(a.symbol.toUpperCase()))
        ?.weight ?? 0
    : 0;
  const baselineNav = snapshot?.nav ?? 100_000;
  nav += baselineNav * cashWeight;
  return nav;
}

export async function snapshotFundNav(
  fundId: string,
  intel?: MarketIntelligencePacket | null
): Promise<{ nav: number; pnlPct: number }> {
  let nav: number;
  if (intel) {
    nav = await markPositionsFromIntel(fundId, intel);
  } else {
    const positions = await prisma.position.findMany({ where: { fundId } });
    nav = positions.reduce((s, p) => s + p.marketValueUsd, 0);
    if (nav <= 0) {
      const snap = await prisma.portfolioSnapshot.findFirst({
        where: { fundId },
        orderBy: { createdAt: "desc" },
      });
      nav = snap?.nav ?? 100_000;
    }
  }

  const prior = await prisma.performancePoint.findFirst({
    where: { fundId },
    orderBy: { createdAt: "desc" },
  });
  const metrics = computePerformanceMetrics(nav, 100_000, prior?.nav);
  await prisma.performancePoint.create({
    data: {
      fundId,
      nav,
      pnlPct: metrics.pnlPct,
      drawdownPct: metrics.drawdownPct,
    },
  });
  return { nav, pnlPct: metrics.pnlPct };
}

export function allocationsToTargetWeights(
  allocations: Allocation[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of allocations) {
    map[a.symbol.toUpperCase()] = a.weight;
  }
  return map;
}
