import type { RiskLevel } from "@/lib/types";

export type CreateFundOptions = {
  riskLevel?: RiskLevel;
  rebalanceCadence?: "daily" | "weekly";
  maxDrawdownPct?: number;
  excludedAssets?: string[];
  userId?: string;
};

export type ApproveFundOptions = {
  disclosureAccepted?: boolean;
  approvalSignature?: `0x${string}`;
  approvalTimestamp?: number;
  intentId?: string;
  walletAddress?: string;
};

export type ProposeRebalanceOptions = {
  triggeredBy?: "manual" | "cron";
  persistIntel?: boolean;
};
