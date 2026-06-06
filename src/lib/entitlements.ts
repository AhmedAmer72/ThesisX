import { prisma } from "@/lib/db";
import { normalizePlan, PLAN_LIMITS } from "@/lib/billing/plans";

export type FeatureFlag =
  | "copy_trading"
  | "rebalance_cron"
  | "advanced_intel"
  | "weekly_reports"
  | "alerts";

const ALL_FLAGS: FeatureFlag[] = [
  "copy_trading",
  "rebalance_cron",
  "advanced_intel",
  "weekly_reports",
  "alerts",
];

export function parseFeatureFlags(json: string): FeatureFlag[] {
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((f): f is FeatureFlag =>
      typeof f === "string" && (ALL_FLAGS as string[]).includes(f)
    );
  } catch {
    return [];
  }
}

export function flagsForPlan(plan: string): FeatureFlag[] {
  return PLAN_LIMITS[normalizePlan(plan)].features;
}

export async function userHasFeature(
  userId: string | null | undefined,
  feature: FeatureFlag
): Promise<boolean> {
  if (!userId) {
    return PLAN_LIMITS.free.features.includes(feature);
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, featureFlagsJson: true },
  });
  if (!user) return PLAN_LIMITS.free.features.includes(feature);
  const explicit = parseFeatureFlags(user.featureFlagsJson);
  if (explicit.length > 0) return explicit.includes(feature);
  return flagsForPlan(user.plan).includes(feature);
}

export async function unlockFeatureForUser(
  userId: string,
  feature: FeatureFlag
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { featureFlagsJson: true, plan: true },
  });
  if (!user) return;
  const flags = new Set([
    ...flagsForPlan(user.plan),
    ...parseFeatureFlags(user.featureFlagsJson),
    feature,
  ]);
  await prisma.user.update({
    where: { id: userId },
    data: { featureFlagsJson: JSON.stringify([...flags]) },
  });
}
