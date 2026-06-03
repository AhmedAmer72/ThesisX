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
};

export type ProposeRebalanceOptions = {
  triggeredBy?: "manual" | "cron";
  persistIntel?: boolean;
};
