import type { TradeOrderPlan } from "@/lib/types";
import { buildTradePlanFromAllocations } from "@/lib/sodex/client";
import { buildDeltaTradePlan } from "@/lib/portfolio/delta-rebalance";
import type { PositionRow } from "@/lib/portfolio/positions";

export function buildExecutionTradePlan(
  allocations: { symbol: string; weight: number }[],
  options: {
    prices: Record<string, number>;
    notionalUsd?: number;
    positions?: PositionRow[];
    useDelta?: boolean;
  }
): TradeOrderPlan[] {
  const notionalUsd = options.notionalUsd ?? 100_000;
  if (options.useDelta && options.positions && options.positions.length > 0) {
    return buildDeltaTradePlan(allocations, options.positions, {
      notionalUsd,
      prices: options.prices,
    });
  }
  return buildTradePlanFromAllocations(allocations, {
    notionalUsd,
    prices: options.prices,
  });
}
