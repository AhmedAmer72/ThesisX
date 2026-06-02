import type {
  Allocation,
  MarketIntelligencePacket,
  MarketPulseSummary,
} from "@/lib/types";

export type SignalKind =
  | "market_regime"
  | "opportunity"
  | "risk"
  | "catalyst"
  | "liquidity"
  | "trend";

export type SosoSignal = {
  id: string;
  kind: SignalKind;
  module: string;
  endpoint: string;
  label: string;
  summary: string;
  confidence: number;
  affectedAssets: string[];
  decisionImpact: "overweight" | "underweight" | "avoid" | "neutral";
  evidence: string;
  fetchedAt: string;
};

export type AllocationSignalLink = {
  symbol: string;
  weight: number;
  signals: SosoSignal[];
  explanation: string;
};

function kindFromModule(module: string): SignalKind {
  if (module === "macro") return "market_regime";
  if (module === "etf") return "liquidity";
  if (module === "feeds") return "catalyst";
  if (module === "index") return "trend";
  if (module === "currency") return "opportunity";
  if (module === "fundraising") return "opportunity";
  if (module === "btc-treasuries") return "trend";
  if (module === "crypto-stocks") return "risk";
  return "neutral" as SignalKind;
}

export function extractSignalsFromPacket(
  packet: MarketIntelligencePacket
): SosoSignal[] {
  const signals: SosoSignal[] = [];
  const fetchedAt = packet.fetchedAt;

  for (const feed of packet.feeds.slice(0, 5)) {
    signals.push({
      id: `feeds-${feed.title.slice(0, 24)}`,
      kind: "catalyst",
      module: "feeds",
      endpoint: "/openapi/v2/feeds",
      label: "News Feed",
      summary: feed.title,
      confidence: feed.sentiment === "bullish" ? 72 : feed.sentiment === "bearish" ? 68 : 55,
      affectedAssets: [],
      decisionImpact:
        feed.sentiment === "bullish"
          ? "overweight"
          : feed.sentiment === "bearish"
            ? "underweight"
            : "neutral",
      evidence: feed.summary ?? feed.title,
      fetchedAt,
    });
  }

  for (const etf of packet.etf.slice(0, 4)) {
    const inflow = etf.flow?.toLowerCase().includes("inflow");
    signals.push({
      id: `etf-${etf.name}`,
      kind: "liquidity",
      module: "etf",
      endpoint: "/openapi/v2/etf/currentEtfDataMetrics",
      label: "ETF Flow",
      summary: `${etf.name}: ${etf.flow ?? "flow data"}`,
      confidence: 75,
      affectedAssets: etf.name.includes("BTC")
        ? ["BTC"]
        : etf.name.includes("ETH")
          ? ["ETH"]
          : etf.name.includes("SOL")
            ? ["SOL"]
            : [],
      decisionImpact: inflow ? "overweight" : "underweight",
      evidence: `ETF change ${etf.changePct ?? "n/a"}%`,
      fetchedAt,
    });
  }

  for (const idx of packet.indexes.slice(0, 4)) {
    const positive = (idx.changePct ?? 0) > 0;
    signals.push({
      id: `index-${idx.name}`,
      kind: "trend",
      module: "index",
      endpoint: "/openapi/v2/index",
      label: "SSI Index",
      summary: `${idx.name} ${idx.changePct ?? 0}%`,
      confidence: 70,
      affectedAssets: [],
      decisionImpact: positive ? "overweight" : "underweight",
      evidence: `Sector ${idx.sector ?? "general"}`,
      fetchedAt,
    });
  }

  for (const macro of packet.macro.slice(0, 3)) {
    signals.push({
      id: `macro-${macro.event}`,
      kind: "market_regime",
      module: "macro",
      endpoint: "/openapi/v2/macro",
      label: "Macro Event",
      summary: macro.event,
      confidence: 65,
      affectedAssets: [],
      decisionImpact:
        macro.impact?.toLowerCase().includes("risk-off")
          ? "underweight"
          : "neutral",
      evidence: `${macro.date ?? ""} ${macro.impact ?? ""}`.trim(),
      fetchedAt,
    });
  }

  for (const c of packet.currencies.slice(0, 6)) {
    const ch = c.change24h ?? 0;
    signals.push({
      id: `currency-${c.symbol}`,
      kind: "opportunity",
      module: "currency",
      endpoint: "/openapi/v2/currency",
      label: "Spot Mover",
      summary: `${c.symbol} ${ch >= 0 ? "+" : ""}${ch.toFixed(2)}% 24h`,
      confidence: Math.min(90, 50 + Math.abs(ch) * 4),
      affectedAssets: [c.symbol],
      decisionImpact: ch > 2 ? "overweight" : ch < -2 ? "underweight" : "neutral",
      evidence: `Price ${c.price ?? "n/a"}`,
      fetchedAt,
    });
  }

  if (packet.marketPulse) {
    signals.push(marketPulseSignal(packet.marketPulse, fetchedAt));
  }

  return signals;
}

function marketPulseSignal(
  pulse: MarketPulseSummary,
  fetchedAt: string
): SosoSignal {
  return {
    id: "market-pulse",
    kind: "market_regime",
    module: "aggregate",
    endpoint: "computed",
    label: "Market Pulse",
    summary: `Risk-on score ${pulse.riskOnScore}/100`,
    confidence: 80,
    affectedAssets: [],
    decisionImpact: pulse.riskOnScore >= 55 ? "overweight" : "underweight",
    evidence: `ETF inflows ${pulse.etfInflowCount}, bullish headlines ${pulse.bullishHeadlines}`,
    fetchedAt,
  };
}

export function linkSignalsToAllocations(
  allocations: Allocation[],
  signals: SosoSignal[]
): AllocationSignalLink[] {
  return allocations.map((alloc) => {
    const related = signals.filter(
      (s) =>
        s.affectedAssets.includes(alloc.symbol) ||
        s.decisionImpact === "overweight" ||
        s.summary.toLowerCase().includes(alloc.symbol.toLowerCase())
    );
    const top = related.slice(0, 3);
    const explanation =
      top.length > 0
        ? top.map((s) => `${s.label}: ${s.summary}`).join(" · ")
        : alloc.rationale ?? "Committee-weighted from SoSo universe";
    return {
      symbol: alloc.symbol,
      weight: alloc.weight,
      signals: top,
      explanation,
    };
  });
}

export function attachSignalsToPacket(
  packet: MarketIntelligencePacket
): MarketIntelligencePacket & { signals: SosoSignal[] } {
  return {
    ...packet,
    signals: extractSignalsFromPacket(packet),
  };
}
