import { z } from "zod";

export const RiskLevelSchema = z.enum(["low", "medium", "high", "aggressive"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const AgentStanceSchema = z.enum([
  "bullish",
  "bearish",
  "neutral",
  "cautious",
]);
export type AgentStance = z.infer<typeof AgentStanceSchema>;

export const AllocationSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  weight: z.number().min(0).max(1),
  sector: z.string().optional(),
  rationale: z.string().optional(),
});
export type Allocation = z.infer<typeof AllocationSchema>;

export const AgentVoteOutputSchema = z.object({
  agentName: z.string(),
  stance: AgentStanceSchema,
  confidence: z.number().min(0).max(100),
  rationale: z.string(),
  sources: z.array(z.string()).default([]),
});

export const CommitteeResultSchema = z.object({
  fundName: z.string(),
  strategyType: z.string(),
  riskLevel: RiskLevelSchema,
  thesis: z.object({
    summary: z.string(),
    outlook: z.string(),
    narratives: z.array(z.string()),
    constraints: z.array(z.string()),
  }),
  allocations: z.array(AllocationSchema),
  agentVotes: z.array(AgentVoteOutputSchema),
  confidence: z.number().min(0).max(100),
  executionRecommendation: z.enum(["execute", "hold", "reduce"]),
});

export type CommitteeResult = z.infer<typeof CommitteeResultSchema>;

export interface IntelligenceSource {
  module: string;
  endpoint: string;
  label: string;
  fetchedAt: string;
  cacheHit?: boolean;
}

export type IntelligenceModuleStatus = "ok" | "error" | "cached";

export interface IntelligenceModuleHealth {
  module: string;
  label: string;
  endpoint: string;
  status: IntelligenceModuleStatus;
  error?: string;
  fetchedAt: string;
  cacheHit: boolean;
}

export interface MarketPulseSummary {
  riskOnScore: number;
  etfInflowCount: number;
  bullishHeadlines: number;
  indexesPositive: number;
  topHeadline?: string;
  leadingIndex?: string;
}

export interface TopMover {
  symbol: string;
  name: string;
  change24h: number;
  price?: number;
}

export interface AnalysisChartRef {
  id: string;
  title: string;
  category?: string;
}

export interface BenchmarkRef {
  name: string;
  changePct?: number;
  sector?: string;
}

export type SignalKind =
  | "market_regime"
  | "opportunity"
  | "risk"
  | "catalyst"
  | "liquidity"
  | "trend";

export interface SosoSignal {
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
}

export interface MarketIntelligencePacket {
  fetchedAt: string;
  demoMode: boolean;
  sources: IntelligenceSource[];
  moduleHealth?: IntelligenceModuleHealth[];
  feeds: { title: string; summary?: string; sentiment?: string }[];
  etf: { name: string; flow?: string; changePct?: number }[];
  indexes: { name: string; changePct?: number; sector?: string }[];
  macro: { event: string; date?: string; impact?: string }[];
  currencies: { symbol: string; name: string; price?: number; change24h?: number }[];
  fundraising: { project: string; amount?: string; sector?: string }[];
  btcTreasuries: { company: string; btcHoldings?: number }[];
  cryptoStocks: { ticker: string; sector?: string; changePct?: number }[];
  charts?: AnalysisChartRef[];
  narratives: string[];
  narrativeTags?: string[];
  topMovers?: TopMover[];
  benchmarks?: BenchmarkRef[];
  marketPulse?: MarketPulseSummary;
  signals?: SosoSignal[];
}

export interface TradeOrderPlan {
  symbol: string;
  side: "buy" | "sell";
  quantity: string;
  notionalUsd?: number;
}

export interface RiskCheckResult {
  name: string;
  passed: boolean;
  message: string;
}
