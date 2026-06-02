import type { MarketIntelligencePacket } from "@/lib/types";
import { sosoClient } from "@/lib/soso/client";
import { isSosoSetupError } from "@/lib/soso/errors";

export type WeeklyReport = {
  fundName: string;
  period: string;
  marketOutlook: string;
  portfolioChanges: string;
  rationale: string;
  riskAnalysis: string;
  sosoHighlights: string[];
  etfSummary: string;
  macroWatch: string;
  topMovers: string[];
  generatedAt: string;
  liveIntelligence: boolean;
};

export async function buildWeeklyReport(input: {
  fundName: string;
  riskLevel: string;
  rebalanceCadence: string;
  thesisSummary?: string;
  thesisOutlook?: string;
  rebalanceReason?: string;
  snapshot?: MarketIntelligencePacket | null;
}): Promise<WeeklyReport> {
  let intel = input.snapshot ?? null;
  let live = false;

  if (!intel) {
    try {
      intel = await sosoClient.buildIntelligencePacket({ liveOnly: true });
      live = !intel.demoMode;
    } catch (e) {
      if (!isSosoSetupError(e)) throw e;
      intel = null;
    }
  } else {
    live = !intel.demoMode;
  }

  const highlights: string[] = [];
  if (intel) {
    if (intel.marketPulse?.topHeadline) {
      highlights.push(`Headline: ${intel.marketPulse.topHeadline}`);
    }
    highlights.push(
      `Risk-on score ${intel.marketPulse?.riskOnScore ?? 0}/100 · ${intel.etf.length} ETF trackers · ${intel.indexes.length} indexes`
    );
    for (const n of intel.narratives.slice(0, 3)) highlights.push(n);
    if (intel.fundraising[0]) {
      highlights.push(
        `Fundraising: ${intel.fundraising[0].project} (${intel.fundraising[0].amount ?? "n/a"})`
      );
    }
  } else {
    highlights.push(
      "Live SoSoValue unavailable — configure SOSOVALUE_API_KEY in Settings."
    );
  }

  const etfSummary = intel?.etf.length
    ? intel.etf
        .slice(0, 3)
        .map((e) => `${e.name} ${e.flow ?? ""} (${e.changePct ?? 0}%)`)
        .join("; ")
    : "No live ETF data";

  const macroWatch = intel?.macro.length
    ? intel.macro.map((m) => `${m.event} (${m.date ?? "TBD"})`).join("; ")
    : "No macro calendar";

  const topMovers =
    intel?.topMovers?.map(
      (m) => `${m.symbol} ${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(1)}%`
    ) ?? [];

  return {
    fundName: input.fundName,
    period: "weekly",
    marketOutlook:
      intel && !intel.demoMode
        ? (input.thesisOutlook ??
          `Live SoSoValue: risk-on ${intel.marketPulse?.riskOnScore ?? 0}/100, ${intel.etf.length} ETF trackers, ${intel.indexes.filter((i) => (i.changePct ?? 0) > 0).length} rising indexes.`)
        : (input.thesisOutlook ?? "Enable SOSOVALUE_API_KEY for live market outlook."),
    portfolioChanges: input.rebalanceReason ?? "No changes",
    rationale: input.thesisSummary ?? "",
    riskAnalysis: `Risk: ${input.riskLevel}. Rebalance: ${input.rebalanceCadence}.`,
    sosoHighlights: highlights,
    etfSummary,
    macroWatch,
    topMovers,
    generatedAt: new Date().toISOString(),
    liveIntelligence: live,
  };
}
