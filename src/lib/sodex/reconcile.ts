import { prisma } from "@/lib/db";
import { logExecution } from "@/lib/observability";
import { fetchOrderStatus, mapRemoteStatusToLocal } from "@/lib/sodex/order-status";
import { priceMapFromIntel } from "@/lib/portfolio/mark-to-market";
import {
  applyFillToPositions,
  getFundPositions,
  snapshotFundNav,
} from "@/lib/portfolio/positions";
import type { Allocation, MarketIntelligencePacket } from "@/lib/types";
import { getExecutionMode } from "@/lib/buildathon";

export type ReconciliationResult = {
  fundId: string;
  ordersChecked: number;
  updated: number;
  mismatches: string[];
  nav?: number;
};

export async function reconcileFundExecution(
  fundId: string,
  intel?: MarketIntelligencePacket | null
): Promise<ReconciliationResult> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      executionOrders: { orderBy: { createdAt: "desc" }, take: 20 },
      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      thesis: true,
      performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!fund) throw new Error("Fund not found");

  let updated = 0;
  const mismatches: string[] = [];
  const mode = getExecutionMode();

  let packet: MarketIntelligencePacket | null = intel ?? null;
  if (!packet && fund.thesis?.intelPacketJson) {
    try {
      packet = JSON.parse(fund.thesis.intelPacketJson) as MarketIntelligencePacket;
    } catch {
      packet = null;
    }
  }

  for (const order of fund.executionOrders) {
    if (order.status === "failed" || order.status === "error") {
      mismatches.push(`${order.symbol}: ${order.status}`);
      continue;
    }

    if (
      order.status === "submitted" ||
      order.status === "filled_simulated"
    ) {
      let nextStatus = order.status;

      if (mode !== "mock" && order.externalRef && !order.externalRef.startsWith("mock-")) {
        const remote = await fetchOrderStatus(order.externalRef);
        if (remote) {
          nextStatus = mapRemoteStatusToLocal(remote.status);
        } else {
          nextStatus = "submitted";
        }
      } else if (order.status === "filled_simulated") {
        nextStatus = "filled";
      } else if (order.status === "submitted" && mode === "mock") {
        nextStatus = "filled";
      }

      if (nextStatus !== order.status) {
        await prisma.executionOrder.update({
          where: { id: order.id },
          data: { status: nextStatus },
        });
        updated += 1;
      } else if (nextStatus === "filled" || nextStatus === "reconciled") {
        await prisma.executionOrder.update({
          where: { id: order.id },
          data: { status: "reconciled" },
        });
        updated += 1;
      }

      if (
        ["filled", "reconciled"].includes(nextStatus) &&
        order.status !== "reconciled"
      ) {
        const px =
          packet?.currencies.find(
            (c) => c.symbol.toUpperCase() === order.symbol.toUpperCase()
          )?.price ?? 0;
        if (px > 0) {
          await applyFillToPositions(
            fundId,
            order.symbol,
            order.side as "buy" | "sell",
            Number(order.quantity),
            px
          );
        }
      }
    }
  }

  const snapshot = fund.portfolioSnapshots[0];

  const filledCount = fund.executionOrders.filter((o) =>
    ["filled", "reconciled", "filled_simulated", "submitted"].includes(o.status)
  ).length;

  let nav: number | undefined;
  if (snapshot && filledCount > 0) {
    const snapResult = await snapshotFundNav(fundId, packet);
    nav = snapResult.nav;
    await prisma.portfolioSnapshot.create({
      data: {
        fundId,
        allocationsJson: snapshot.allocationsJson,
        nav: snapResult.nav,
        confidence: snapshot.confidence,
        rebalanceReason: "Post-execution reconciliation (live marks)",
      },
    });
    await getFundPositions(fundId);
  }

  await prisma.reasoningLog.create({
    data: {
      fundId,
      type: "reconciliation",
      title: "Execution reconciled",
      body: `Checked ${fund.executionOrders.length} orders; updated ${updated}. NAV ${nav != null ? nav.toFixed(2) : "n/a"}.`,
      metadataJson: JSON.stringify({ mismatches, nav, mode }),
    },
  });

  logExecution(fundId, "reconciliation_complete", {
    ordersChecked: fund.executionOrders.length,
    updated,
    mismatches,
    nav,
  });

  return {
    fundId,
    ordersChecked: fund.executionOrders.length,
    updated,
    mismatches,
    nav,
  };
}
