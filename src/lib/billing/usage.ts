import { prisma } from "@/lib/db";

export async function recordUsage(
  userId: string | null | undefined,
  event: string,
  quantity = 1,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!userId) return;
  await prisma.usageEvent.create({
    data: {
      userId,
      event,
      quantity,
      metadataJson: JSON.stringify(metadata ?? {}),
    },
  });
}

export async function getUsageSummary(
  userId: string,
  since: Date
): Promise<Record<string, number>> {
  const rows = await prisma.usageEvent.groupBy({
    by: ["event"],
    where: { userId, createdAt: { gte: since } },
    _sum: { quantity: true },
  });
  const summary: Record<string, number> = {};
  for (const row of rows) {
    summary[row.event] = row._sum.quantity ?? 0;
  }
  return summary;
}
