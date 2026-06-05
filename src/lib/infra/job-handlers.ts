import { reconcileFundExecution } from "@/lib/sodex/reconcile";
import { sosoClient } from "@/lib/soso/client";
import { prisma } from "@/lib/db";
import { snapshotFundNav } from "@/lib/portfolio/positions";
import type { JobType } from "@/lib/infra/queue";

export async function dispatchJob(
  type: JobType,
  fundId: string | null,
  payloadJson: string
): Promise<void> {
  const payload = JSON.parse(payloadJson || "{}") as Record<string, unknown>;

  switch (type) {
    case "reconcile_orders": {
      if (!fundId) throw new Error("fundId required");
      await reconcileFundExecution(fundId);
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
      break;
    }
    case "nav_snapshot": {
      if (!fundId) throw new Error("fundId required");
      await snapshotFundNav(fundId, payload.intelPacket as never);
      break;
    }
    case "weekly_report":
    case "committee_run":
    case "alert_delivery":
      // Handled by dedicated services when wired
      break;
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}
