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

const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;

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

/** Skip if same type+fund (or user) alert was created recently. */
async function recentlyNotified(
  type: string,
  fundId?: string,
  userId?: string
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const existing = await prisma.notification.findFirst({
    where: {
      type,
      createdAt: { gte: since },
      ...(fundId ? { fundId } : {}),
      ...(userId ? { userId } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function maybeNotify(input: AlertInput): Promise<string | null> {
  if (await recentlyNotified(input.type, input.fundId, input.userId)) {
    return null;
  }
  const n = await createNotification(input);
  return n.id;
}

export async function generateSosoAlerts(
  intel: MarketIntelligencePacket,
  fundId?: string,
  userId?: string
) {
  const reqId = logRequest("generateSosoAlerts", { fundId });
  const created: string[] = [];

  if (intel.demoMode) return created;

  const etfOutflows = intel.etf.filter((e) => {
    const flow = (e.flow ?? "").replace(/[^0-9.-]/g, "");
    return flow.startsWith("-") || (flow && Number(flow) < 0);
  });
  if (etfOutflows.length >= 2) {
    const id = await maybeNotify({
      userId,
      fundId,
      type: "etf_outflow",
      title: "ETF outflow alert",
      body: `${etfOutflows.length} ETFs showing net outflows: ${etfOutflows.map((e) => e.name).join(", ")}`,
      metadata: { requestId: reqId, count: etfOutflows.length },
    });
    if (id) created.push(id);
  }

  const highImpactMacro = intel.macro.filter(
    (m) =>
      m.impact?.toLowerCase().includes("high") ||
      m.event.toLowerCase().includes("cpi") ||
      m.event.toLowerCase().includes("fomc")
  );
  for (const ev of highImpactMacro.slice(0, 2)) {
    const id = await maybeNotify({
      userId,
      fundId,
      type: "macro_event",
      title: "Macro watch",
      body: `${ev.event}${ev.date ? ` (${ev.date})` : ""} — ${ev.impact ?? "monitor"}`,
      metadata: { requestId: reqId, event: ev.event },
    });
    if (id) created.push(id);
  }

  const drawdownIndexes = intel.indexes.filter((i) => (i.changePct ?? 0) < -3);
  if (drawdownIndexes.length > 0) {
    const id = await maybeNotify({
      userId,
      fundId,
      type: "index_drawdown",
      title: "Index drawdown",
      body: `${drawdownIndexes.map((i) => `${i.name} ${i.changePct?.toFixed(1)}%`).join("; ")}`,
      metadata: { requestId: reqId },
    });
    if (id) created.push(id);
  }

  const btcSpikes = intel.btcTreasuries.filter(
    (b) => (b.btcHoldings ?? 0) > 10000
  );
  if (btcSpikes.length > 0) {
    const id = await maybeNotify({
      userId,
      fundId,
      type: "btc_treasury",
      title: "BTC treasury activity",
      body: `Large holders: ${btcSpikes
        .slice(0, 3)
        .map((b) => b.company)
        .join(", ")}`,
      metadata: { requestId: reqId },
    });
    if (id) created.push(id);
  }

  if (intel.fundraising.length >= 5) {
    const id = await maybeNotify({
      userId,
      fundId,
      type: "fundraising_surge",
      title: "Fundraising heat",
      body: `${intel.fundraising.length} active fundraising projects tracked`,
      metadata: { requestId: reqId },
    });
    if (id) created.push(id);
  }

  const riskOn = intel.marketPulse?.riskOnScore ?? 50;
  if (riskOn >= 75) {
    const id = await maybeNotify({
      userId,
      fundId,
      type: "risk_on_surge",
      title: "Risk-on surge",
      body: `SoSo risk-on score hit ${riskOn}/100 — consider reviewing allocations before the next rebalance.`,
      metadata: { requestId: reqId, riskOnScore: riskOn },
    });
    if (id) created.push(id);
  } else if (riskOn <= 30) {
    const id = await maybeNotify({
      userId,
      fundId,
      type: "risk_off",
      title: "Risk-off signal",
      body: `SoSo risk-on score at ${riskOn}/100 — defensive posture may be warranted.`,
      metadata: { requestId: reqId, riskOnScore: riskOn },
    });
    if (id) created.push(id);
  }

  return created;
}
