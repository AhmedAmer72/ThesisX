import { reconcileFundExecution } from "@/lib/sodex/reconcile";
import { sosoClient } from "@/lib/soso/client";
import { prisma } from "@/lib/db";
import { snapshotFundNav } from "@/lib/portfolio/positions";
import { persistWeeklyReport } from "@/lib/reports/service";
import { generateSosoAlerts } from "@/lib/alerts/service";
import { isCadenceElapsed, proposeRebalance } from "@/lib/fund/service";
import { publishEvent } from "@/lib/realtime/event-bus";
import type { JobType } from "@/lib/infra/queue";
import type { MarketIntelligencePacket } from "@/lib/types";

async function loadFundIntel(fundId: string) {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      thesis: true,
      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!fund) throw new Error("Fund not found");
  let intel: MarketIntelligencePacket | null = null;
  if (fund.thesis?.intelPacketJson) {
    try {
      intel = JSON.parse(fund.thesis.intelPacketJson) as MarketIntelligencePacket;
    } catch {
      intel = null;
    }
  }
  return { fund, intel };
}

export async function dispatchJob(
  type: JobType,
  fundId: string | null,
  payloadJson: string
): Promise<void> {
  const payload = JSON.parse(payloadJson || "{}") as Record<string, unknown>;

  switch (type) {
    case "reconcile_orders": {
      if (!fundId) throw new Error("fundId required");
      const result = await reconcileFundExecution(fundId);
      await publishEvent(`fund:${fundId}`, "reconcile", {
        ordersChecked: result.ordersChecked,
        nav: result.nav ?? null,
      });
      break;
    }

    case "intelligence_refresh": {
      if (!fundId) throw new Error("fundId required");
      const fund = await prisma.fund.findUnique({
        where: { id: fundId },
        include: { thesis: true },
      });
      if (!fund?.thesis) return;
      const intel = await sosoClient.buildIntelligencePacket({
        liveOnly: true,
        useCache: false,
      });
      await prisma.fundThesis.update({
        where: { fundId },
        data: {
          intelPacketJson: JSON.stringify(intel),
          intelFetchedAt: new Date(intel.fetchedAt),
          sourcesJson: JSON.stringify(intel.sources),
        },
      });
      await publishEvent("market-pulse", "intel_refresh", {
        fundId,
        riskOnScore: intel.marketPulse?.riskOnScore ?? 0,
        demoMode: intel.demoMode,
      });
      break;
    }

    case "nav_snapshot": {
      if (!fundId) throw new Error("fundId required");
      const { intel } = await loadFundIntel(fundId);
      await snapshotFundNav(
        fundId,
        (payload.intelPacket as MarketIntelligencePacket | undefined) ??
          intel ??
          undefined
      );
      break;
    }

    case "weekly_report": {
      if (!fundId) throw new Error("fundId required");
      const { fund, intel } = await loadFundIntel(fundId);
      const fresh = await sosoClient
        .buildIntelligencePacket({ liveOnly: true, useCache: true })
        .catch(() => intel);
      const { reportId, report } = await persistWeeklyReport({
        fundId,
        fundName: fund.name,
        riskLevel: fund.riskLevel,
        rebalanceCadence: fund.rebalanceCadence,
        thesisSummary: fund.thesis?.summary,
        thesisOutlook: fund.thesis?.outlook,
        rebalanceReason:
          fund.portfolioSnapshots[0]?.rebalanceReason ?? undefined,
        snapshot: fresh,
        userId: fund.userId ?? (payload.userId as string | undefined),
      });
      await publishEvent(`fund:${fundId}`, "weekly_report", {
        reportId,
        period: report.period,
        live: report.liveIntelligence,
      });
      break;
    }

    case "alert_delivery": {
      if (!fundId) throw new Error("fundId required");
      const { fund } = await loadFundIntel(fundId);
      const intel = await sosoClient.buildIntelligencePacket({
        liveOnly: true,
        useCache: true,
      });
      if (fund.thesis) {
        await prisma.fundThesis.update({
          where: { fundId },
          data: {
            intelPacketJson: JSON.stringify(intel),
            intelFetchedAt: new Date(intel.fetchedAt),
            sourcesJson: JSON.stringify(intel.sources),
          },
        });
      }
      const created = await generateSosoAlerts(
        intel,
        fundId,
        fund.userId ?? (payload.userId as string | undefined)
      );
      if (created.length > 0) {
        await publishEvent(`fund:${fundId}`, "alerts", {
          count: created.length,
          ids: created,
        });
        await publishEvent("alerts", "alerts_batch", {
          fundId,
          count: created.length,
        });
      }
      break;
    }

    case "committee_run": {
      if (!fundId) throw new Error("fundId required");
      const fund = await prisma.fund.findUnique({
        where: { id: fundId },
        include: {
          rebalanceRuns: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
      if (!fund || fund.status !== "active") return;
      const pending = await prisma.rebalanceRun.findFirst({
        where: { fundId, status: "pending_review" },
      });
      if (pending) return;
      if (
        !isCadenceElapsed(
          fund.rebalanceCadence,
          fund.rebalanceRuns[0]?.createdAt ?? null
        )
      ) {
        return;
      }
      try {
        const proposal = await proposeRebalance(fundId, {
          triggeredBy: "cron",
        });
        await publishEvent(`fund:${fundId}`, "committee_rebalance", {
          status: "proposed",
          intentId: proposal.tradeIntentId ?? null,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "committee_skipped";
        if (/pending|kill switch|must be active/i.test(message)) {
          return;
        }
        throw e;
      }
      break;
    }

    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}
