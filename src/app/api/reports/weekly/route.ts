import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { persistWeeklyReport, listFundReports } from "@/lib/reports/service";
import type { MarketIntelligencePacket } from "@/lib/types";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/reports/weekly");
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json(
      { error: "slug required", requestId: reqId },
      { status: 400 }
    );
  }
  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: {
      thesis: true,
      portfolioSnapshots: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });
  if (!fund) {
    return NextResponse.json(
      { error: "Not found", requestId: reqId },
      { status: 404 }
    );
  }

  const history = req.nextUrl.searchParams.get("history") === "true";
  if (history) {
    const reports = await listFundReports(fund.id);
    return NextResponse.json({ reports, requestId: reqId });
  }

  let snapshot: MarketIntelligencePacket | null = null;
  if (fund.thesis?.intelPacketJson) {
    try {
      snapshot = JSON.parse(
        fund.thesis.intelPacketJson
      ) as MarketIntelligencePacket;
    } catch {
      snapshot = null;
    }
  }

  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  const persist = req.nextUrl.searchParams.get("persist") !== "false";

  if (persist) {
    const { report, reportId } = await persistWeeklyReport({
      fundId: fund.id,
      fundName: fund.name,
      riskLevel: fund.riskLevel,
      rebalanceCadence: fund.rebalanceCadence,
      thesisSummary: fund.thesis?.summary,
      thesisOutlook: fund.thesis?.outlook,
      rebalanceReason: fund.portfolioSnapshots[0]?.rebalanceReason ?? undefined,
      snapshot: refresh ? null : snapshot,
      userId: fund.userId ?? undefined,
    });
    return NextResponse.json({ report, reportId, requestId: reqId });
  }

  const { buildWeeklyReport } = await import("@/lib/soso/weekly-report");
  const report = await buildWeeklyReport({
    fundName: fund.name,
    riskLevel: fund.riskLevel,
    rebalanceCadence: fund.rebalanceCadence,
    thesisSummary: fund.thesis?.summary,
    thesisOutlook: fund.thesis?.outlook,
    rebalanceReason: fund.portfolioSnapshots[0]?.rebalanceReason ?? undefined,
    snapshot: refresh ? null : snapshot,
  });

  return NextResponse.json({ report, requestId: reqId });
}
