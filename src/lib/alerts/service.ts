import { prisma } from "@/lib/db";
import type { MarketIntelligencePacket } from "@/lib/types";
import { logRequest } from "@/lib/observability";

export type AlertInput = {
  userId?: string;
  fundId?: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export async function createNotification(input: AlertInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      fundId: input.fundId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    },
  });
}

export async function generateSosoAlerts(
  intel: MarketIntelligencePacket,
  fundId?: string,
  userId?: string
) {
  const reqId = logRequest("generateSosoAlerts", { fundId });
  const created: string[] = [];

  const etfOutflows = intel.etf.filter((e) => {
    const flow = (e.flow ?? "").replace(/[^0-9.-]/g, "");
    return flow.startsWith("-") || (flow && Number(flow) < 0);
  });
  if (etfOutflows.length >= 2) {
    const n = await createNotification({
      userId,
      fundId,
      type: "etf_outflow",
      title: "ETF outflow alert",
      body: `${etfOutflows.length} ETFs showing net outflows: ${etfOutflows.map((e) => e.name).join(", ")}`,
      metadata: { requestId: reqId, count: etfOutflows.length },
    });
    created.push(n.id);
  }

  const highImpactMacro = intel.macro.filter(
    (m) =>
      m.impact?.toLowerCase().includes("high") ||
      m.event.toLowerCase().includes("cpi") ||
      m.event.toLowerCase().includes("fomc")
  );
  for (const ev of highImpactMacro.slice(0, 2)) {
    const n = await createNotification({
      userId,
      fundId,
      type: "macro_event",
      title: "Macro watch",
      body: `${ev.event}${ev.date ? ` (${ev.date})` : ""} — ${ev.impact ?? "monitor"}`,
      metadata: { requestId: reqId },
    });
    created.push(n.id);
  }

  const drawdownIndexes = intel.indexes.filter((i) => (i.changePct ?? 0) < -3);
  if (drawdownIndexes.length > 0) {
    const n = await createNotification({
      userId,
      fundId,
      type: "index_drawdown",
      title: "Index drawdown",
      body: `${drawdownIndexes.map((i) => `${i.name} ${i.changePct?.toFixed(1)}%`).join("; ")}`,
      metadata: { requestId: reqId },
    });
    created.push(n.id);
  }

  const btcSpikes = intel.btcTreasuries.filter((b) => (b.btcHoldings ?? 0) > 10000);
  if (btcSpikes.length > 0) {
    const n = await createNotification({
      userId,
      fundId,
      type: "btc_treasury",
      title: "BTC treasury activity",
      body: `Large holders: ${btcSpikes.slice(0, 3).map((b) => b.company).join(", ")}`,
      metadata: { requestId: reqId },
    });
    created.push(n.id);
  }

  if (intel.fundraising.length >= 5) {
    const n = await createNotification({
      userId,
      fundId,
      type: "fundraising_surge",
      title: "Fundraising heat",
      body: `${intel.fundraising.length} active fundraising projects tracked`,
      metadata: { requestId: reqId },
    });
    created.push(n.id);
  }

  return created;
}
