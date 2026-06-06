import type { FeatureFlag } from "@/lib/entitlements";

export type PlanId = "free" | "pro" | "trader" | "institutional" | "enterprise";

export const PLAN_LIMITS: Record<
  PlanId,
  {
    aiCreditsPerMonth: number;
    alertsPerMonth: number;
    watchedWallets: number;
    features: FeatureFlag[];
  }
> = {
  free: {
    aiCreditsPerMonth: 20,
    alertsPerMonth: 10,
    watchedWallets: 1,
    features: ["copy_trading", "weekly_reports"],
  },
  pro: {
    aiCreditsPerMonth: 200,
    alertsPerMonth: 100,
    watchedWallets: 5,
    features: [
      "copy_trading",
      "rebalance_cron",
      "advanced_intel",
      "weekly_reports",
      "alerts",
    ],
  },
  trader: {
    aiCreditsPerMonth: 1000,
    alertsPerMonth: 500,
    watchedWallets: 20,
    features: [
      "copy_trading",
      "rebalance_cron",
      "advanced_intel",
      "weekly_reports",
      "alerts",
    ],
  },
  institutional: {
    aiCreditsPerMonth: 5000,
    alertsPerMonth: 2000,
    watchedWallets: 100,
    features: [
      "copy_trading",
      "rebalance_cron",
      "advanced_intel",
      "weekly_reports",
      "alerts",
    ],
  },
  enterprise: {
    aiCreditsPerMonth: 50_000,
    alertsPerMonth: 10_000,
    watchedWallets: 1000,
    features: [
      "copy_trading",
      "rebalance_cron",
      "advanced_intel",
      "weekly_reports",
      "alerts",
    ],
  },
};

export function normalizePlan(plan: string): PlanId {
  if (plan in PLAN_LIMITS) return plan as PlanId;
  return "free";
}
