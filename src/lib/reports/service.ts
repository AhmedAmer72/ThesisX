import { prisma } from "@/lib/db";
import { buildWeeklyReport } from "@/lib/soso/weekly-report";
import { generateSosoAlerts } from "@/lib/alerts/service";
import type { MarketIntelligencePacket } from "@/lib/types";

export async function persistWeeklyReport(input: {
  fundId: string;
  fundName: string;
  riskLevel: string;
  rebalanceCadence: string;
  thesisSummary?: string;
  thesisOutlook?: string;
  rebalanceReason?: string;
  snapshot?: MarketIntelligencePacket | null;
  userId?: string;
}) {
  const report = await buildWeeklyReport({
    fundName: input.fundName,
    riskLevel: input.riskLevel,
    rebalanceCadence: input.rebalanceCadence,
    thesisSummary: input.thesisSummary,
    thesisOutlook: input.thesisOutlook,
    rebalanceReason: input.rebalanceReason,
    snapshot: input.snapshot,
  });

  const period = report.period;
  const existing = await prisma.fundReport.findFirst({
    where: { fundId: input.fundId, period },
  });

  const row = existing
    ? await prisma.fundReport.update({
        where: { id: existing.id },
        data: { contentJson: JSON.stringify(report), generatedAt: new Date() },
      })
    : await prisma.fundReport.create({
        data: {
          fundId: input.fundId,
          period,
          contentJson: JSON.stringify(report),
        },
      });

  if (input.snapshot && !input.snapshot.demoMode) {
    await generateSosoAlerts(input.snapshot, input.fundId, input.userId);
  }

  return { report, reportId: row.id };
}

export async function listFundReports(fundId: string, limit = 12) {
  const rows = await prisma.fundReport.findMany({
    where: { fundId },
    orderBy: { generatedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    period: r.period,
    generatedAt: r.generatedAt.toISOString(),
    report: JSON.parse(r.contentJson),
  }));
}
