import OpenAI from "openai";
import {
  CommitteeResultSchema,
  type CommitteeResult,
  type MarketIntelligencePacket,
  type RiskLevel,
} from "@/lib/types";
import { isAiRequired } from "@/lib/production";
import { PROMPT_VERSION } from "@/lib/ai/orchestrator";
import { prisma } from "@/lib/db";
import {
  inferRiskLevel,
  normalizeAllocations,
  RISK_PRESETS,
  runRiskChecks,
  allChecksPassed,
} from "@/lib/risk/engine";

const PRIORITY_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "RNDR",
  "TAO",
  "AKT",
  "AR",
  "LINK",
  "AVAX",
];

const AGENTS = [
  "Macro Agent",
  "Narrative Agent",
  "Momentum Agent",
  "Treasury Agent",
  "Risk Agent",
  "Allocation Agent",
] as const;

function sectorFromFundraising(intel: MarketIntelligencePacket): string | null {
  const top = intel.fundraising[0]?.sector;
  return top ?? null;
}

function pickAllocationUniverse(
  intel: MarketIntelligencePacket,
  riskLevel: RiskLevel
): CommitteeResult["allocations"] {
  const infraSymbols = ["RNDR", "TAO", "AKT", "AR", "ETH", "SOL"];
  const hotSector = sectorFromFundraising(intel);

  const byPriority = [...intel.currencies]
    .filter((c) => c.symbol && c.symbol !== "???")
    .sort((a, b) => {
      const ia = PRIORITY_SYMBOLS.indexOf(a.symbol);
      const ib = PRIORITY_SYMBOLS.indexOf(b.symbol);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return (b.change24h ?? 0) - (a.change24h ?? 0);
    });

  const infraPicks = byPriority.filter(
    (c) =>
      infraSymbols.includes(c.symbol) ||
      PRIORITY_SYMBOLS.includes(c.symbol) ||
      (c.change24h ?? 0) > (riskLevel === "aggressive" ? 0.5 : 1)
  );

  let picks = infraPicks.length >= 3 ? infraPicks : byPriority;
  picks = picks.slice(0, 5);

  const weights =
    riskLevel === "aggressive"
      ? [0.22, 0.18, 0.15, 0.12, 0.1]
      : riskLevel === "low"
        ? [0.18, 0.15, 0.12, 0.1, 0.08]
        : [0.2, 0.17, 0.14, 0.11, 0.09];

  return picks.map((c, i) => ({
    symbol: c.symbol,
    name: c.name || c.symbol,
    weight: weights[i] ?? 0.1,
    sector:
      ["RNDR", "TAO", "AKT"].includes(c.symbol)
        ? "AI Infrastructure"
        : c.symbol === "ETH" || c.symbol === "SOL"
          ? "L1"
          : hotSector ?? "Infrastructure",
    rationale: `SoSoValue currency momentum ${c.change24h ?? 0}%${
      intel.topMovers?.some((m) => m.symbol === c.symbol)
        ? " (top mover)"
        : ""
    }`,
  }));
}

function buildDeterministicCommittee(
  prompt: string,
  intel: MarketIntelligencePacket,
  riskLevel: RiskLevel
): CommitteeResult {
  const allocations = pickAllocationUniverse(intel, riskLevel);
  const limits = RISK_PRESETS[riskLevel];
  const normalized = normalizeAllocations(allocations, limits);

  const bullishCount = intel.feeds.filter((f) => f.sentiment === "bullish").length;
  const macroBull =
    intel.etf.some((e) => (e.changePct ?? 0) > 0) ||
    (intel.marketPulse?.etfInflowCount ?? 0) > 0;
  const macroEvents = intel.macro.slice(0, 2).map((m) => m.event).join(", ");
  const treasuryBull = intel.btcTreasuries.length >= 2;
  const stockSectorBull = intel.cryptoStocks.some((s) => (s.changePct ?? 0) > 2);
  const indexMomentum = intel.indexes.filter((i) => (i.changePct ?? 0) > 0).length;

  const agentVotes = [
    {
      agentName: "Macro Agent",
      stance: macroBull ? ("bullish" as const) : ("neutral" as const),
      confidence: macroBull ? 78 : 55,
      rationale: macroBull
        ? `ETF flows (${intel.etf.length} tracked) and macro (${macroEvents || "stable"}) support risk-on. Risk-on score ${intel.marketPulse?.riskOnScore ?? 0}.`
        : "Mixed macro/ETF signals; maintain balanced exposure.",
      sources: intel.sources
        .filter((s) => s.module === "etf" || s.module === "macro")
        .map((s) => s.label),
    },
    {
      agentName: "Narrative Agent",
      stance: bullishCount >= 2 ? ("bullish" as const) : ("neutral" as const),
      confidence: 82,
      rationale: `Narratives: ${intel.narratives.slice(0, 3).join("; ")}. Headlines: ${intel.feeds.length}.`,
      sources: intel.sources.filter((s) => s.module === "feeds").map((s) => s.label),
    },
    {
      agentName: "Momentum Agent",
      stance: indexMomentum >= 2 ? ("bullish" as const) : ("neutral" as const),
      confidence: 76,
      rationale: `${indexMomentum} SSI indexes positive. Top mover: ${intel.topMovers?.[0]?.symbol ?? "n/a"} (${intel.topMovers?.[0]?.change24h ?? 0}%).`,
      sources: intel.sources
        .filter((s) => s.module === "index" || s.module === "currency")
        .map((s) => s.label),
    },
    {
      agentName: "Treasury Agent",
      stance: treasuryBull || stockSectorBull ? ("bullish" as const) : ("neutral" as const),
      confidence: 72,
      rationale: treasuryBull
        ? `Corporate BTC treasury activity (${intel.btcTreasuries.length} names). Crypto equities: ${intel.cryptoStocks.map((s) => s.sector).join(", ")}.`
        : "Limited treasury/equity conviction from SoSo modules.",
      sources: intel.sources
        .filter(
          (s) => s.module === "btc-treasuries" || s.module === "crypto-stocks"
        )
        .map((s) => s.label),
    },
    {
      agentName: "Risk Agent",
      stance: riskLevel === "aggressive" ? ("cautious" as const) : ("neutral" as const),
      confidence: 70,
      rationale: `Risk level ${riskLevel}. Fundraising sectors: ${intel.fundraising.map((f) => f.sector).filter(Boolean).join(", ") || "n/a"}.`,
      sources: ["Risk Policy Engine", ...intel.sources.filter((s) => s.module === "fundraising").map((s) => s.label)],
    },
    {
      agentName: "Allocation Agent",
      stance: "bullish" as const,
      confidence: 84,
      rationale: `Optimized under caps using SoSo currency universe (${intel.currencies.length} assets).`,
      sources: ["Allocation Optimizer"],
    },
  ];

  const nameMatch = prompt.match(/(?:called|named)\s+["']?([^"']+)["']?/i);
  const fundName =
    nameMatch?.[1] ??
    (prompt.toLowerCase().includes("infrastructure")
      ? "Quantum Infrastructure Fund"
      : "ThesisX Alpha Fund");

  const fundraisingNote =
    intel.fundraising.length > 0
      ? ` Active fundraising in ${intel.fundraising.map((f) => f.sector).filter(Boolean).join(", ")}.`
      : "";

  return CommitteeResultSchema.parse({
    fundName,
    strategyType: prompt.toLowerCase().includes("income")
      ? "DeFi Income"
      : prompt.toLowerCase().includes("momentum")
        ? "Narrative Rotation"
        : "AI Infrastructure Growth",
    riskLevel,
    thesis: {
      summary: `Autonomous fund from: "${prompt.slice(0, 120)}..."`,
      outlook: intel.demoMode
        ? "Demo intelligence — enable SOSOVALUE_API_KEY for live SoSoValue modules."
        : `Live SoSoValue: risk-on ${intel.marketPulse?.riskOnScore ?? 0}/100, ${intel.etf.length} ETF trackers, ${indexMomentum} rising indexes.${fundraisingNote}`,
      narratives: intel.narratives,
      constraints: [
        `Max position ${limits.maxPositionPct * 100}%`,
        `Max sector ${limits.maxSectorPct * 100}%`,
        `Stable reserve min ${limits.minStableReserve * 100}%`,
      ],
    },
    allocations: normalized,
    agentVotes,
    confidence: Math.min(
      95,
      70 +
        (macroBull ? 5 : 0) +
        (bullishCount >= 2 ? 5 : 0) +
        (indexMomentum >= 2 ? 4 : 0) +
        (intel.demoMode ? 0 : 8)
    ),
    executionRecommendation: macroBull && indexMomentum >= 1 ? "execute" : "hold",
  });
}

export type CommitteeOptions = {
  riskLevel?: RiskLevel;
  excludedAssets?: string[];
  maxDrawdownPct?: number;
};

function filterExcluded(
  allocations: CommitteeResult["allocations"],
  excluded: string[]
) {
  if (!excluded.length) return allocations;
  const set = new Set(excluded.map((s) => s.toUpperCase()));
  const filtered = allocations.filter((a) => !set.has(a.symbol.toUpperCase()));
  const total = filtered.reduce((s, a) => s + a.weight, 0) || 1;
  return filtered.map((a) => ({ ...a, weight: a.weight / total }));
}

export async function runInvestmentCommittee(
  prompt: string,
  intel: MarketIntelligencePacket,
  options: CommitteeOptions = {}
): Promise<{
  result: CommitteeResult;
  riskChecks: ReturnType<typeof runRiskChecks>;
  approved: boolean;
}> {
  const riskLevel = options.riskLevel ?? inferRiskLevel(prompt);
  const limits = {
    ...RISK_PRESETS[riskLevel],
    ...(options.maxDrawdownPct != null
      ? { maxDrawdownPct: options.maxDrawdownPct }
      : {}),
  };
  const excluded = options.excludedAssets ?? [];

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are the ThesisX investment committee. Agents: ${AGENTS.join(", ")}. Use ALL SoSo intelligence modules: feeds, etf, indexes, macro, currencies, fundraising, btcTreasuries, cryptoStocks, charts, topMovers, marketPulse. Output JSON: fundName, strategyType, riskLevel, thesis {summary,outlook,narratives[],constraints[]}, allocations [{symbol,name,weight,sector,rationale}], agentVotes [{agentName,stance,confidence,rationale,sources[]}], confidence, executionRecommendation (execute|hold|reduce). Symbols must exist in intelligence.currencies.`,
          },
          {
            role: "user",
            content: JSON.stringify({ prompt, intelligence: intel, riskLevel }),
          },
        ],
        temperature: 0.3,
      });
      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        const parsed = CommitteeResultSchema.parse(JSON.parse(raw));
        parsed.riskLevel = riskLevel;
        parsed.allocations = filterExcluded(
          normalizeAllocations(parsed.allocations, limits),
          excluded
        );
        const riskChecks = runRiskChecks(parsed.allocations, limits, excluded);
        await prisma.aiRun.create({
          data: {
            agentName: "Allocation",
            promptVersion: PROMPT_VERSION,
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            inputJson: JSON.stringify({ prompt, riskLevel }),
            outputJson: JSON.stringify(parsed),
            citationsJson: JSON.stringify(intel.sources.map((s) => s.label)),
            confidence: parsed.confidence,
            status: "completed",
          },
        });
        return {
          result: parsed,
          riskChecks,
          approved:
            allChecksPassed(riskChecks) &&
            parsed.executionRecommendation === "execute",
        };
      }
    } catch (e) {
      if (isAiRequired()) {
        throw new Error(
          e instanceof Error ? e.message : "OpenAI committee failed in production"
        );
      }
    }
  }

  if (isAiRequired()) {
    throw new Error("OpenAI committee required but unavailable");
  }

  const result = buildDeterministicCommittee(prompt, intel, riskLevel);
  result.thesis.summary = `[Deterministic committee · ${PROMPT_VERSION}] ${result.thesis.summary}`;
  result.allocations = filterExcluded(
    normalizeAllocations(result.allocations, limits),
    excluded
  );
  const riskChecks = runRiskChecks(result.allocations, limits, excluded);
  return {
    result,
    riskChecks,
    approved: allChecksPassed(riskChecks),
  };
}
