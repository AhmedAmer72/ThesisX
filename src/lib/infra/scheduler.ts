/**
 * Schedules autonomous jobs for active funds (intel, alerts, weekly memos, NAV).
 * Invoked by /api/cron/tick — Vercel Cron or manual CRON_SECRET call.
 */

import { prisma } from "@/lib/db";
import { enqueueJob } from "@/lib/infra/queue";

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function hourKey(d = new Date()): string {
  return d.toISOString().slice(0, 13);
}

export type ScheduleSummary = {
  fundsConsidered: number;
  enqueued: { type: string; fundId: string; jobId: string }[];
};

/** Enqueue a full autonomous cycle for every active fund. */
export async function scheduleAutonomousJobs(): Promise<ScheduleSummary> {
  const funds = await prisma.fund.findMany({
    where: { status: { in: ["active", "pending_review"] } },
    select: { id: true, status: true, userId: true, rebalanceCadence: true },
    take: 100,
  });

  const day = dayKey();
  const hour = hourKey();
  const enqueued: ScheduleSummary["enqueued"] = [];

  for (const fund of funds) {
    const jobs: { type: Parameters<typeof enqueueJob>[0]; key: string }[] = [
      {
        type: "intelligence_refresh",
        key: `intel-${fund.id}-${hour}`,
      },
      {
        type: "alert_delivery",
        key: `alerts-${fund.id}-${hour}`,
      },
      {
        type: "nav_snapshot",
        key: `nav-${fund.id}-${hour}`,
      },
    ];

    if (fund.status === "active") {
      jobs.push({
        type: "weekly_report",
        key: `weekly-${fund.id}-${day}`,
      });
      jobs.push({
        type: "committee_run",
        key: `committee-${fund.id}-${day}`,
      });
      jobs.push({
        type: "reconcile_orders",
        key: `reconcile-${fund.id}-${hour}`,
      });
    }

    for (const j of jobs) {
      const jobId = await enqueueJob(j.type, fund.id, {
        idempotencyKey: j.key,
        payload: { userId: fund.userId, source: "cron" },
      });
      enqueued.push({ type: j.type, fundId: fund.id, jobId });
    }
  }

  return { fundsConsidered: funds.length, enqueued };
}
