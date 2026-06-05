/**
 * Lightweight job queue — persists to DB, processes inline or via worker cron.
 */

import { prisma } from "@/lib/db";
import { logError, recordMetric } from "@/lib/observability";

export type JobType =
  | "intelligence_refresh"
  | "committee_run"
  | "reconcile_orders"
  | "weekly_report"
  | "alert_delivery"
  | "nav_snapshot";

export type EnqueueOptions = {
  runAt?: Date;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
};

export async function enqueueJob(
  type: JobType,
  fundId: string | null,
  options: EnqueueOptions = {}
): Promise<string> {
  if (options.idempotencyKey) {
    const existing = await prisma.jobQueue.findFirst({
      where: {
        idempotencyKey: options.idempotencyKey,
        status: { in: ["pending", "running"] },
      },
    });
    if (existing) return existing.id;
  }

  const job = await prisma.jobQueue.create({
    data: {
      type,
      fundId,
      status: "pending",
      payloadJson: JSON.stringify(options.payload ?? {}),
      runAt: options.runAt ?? new Date(),
      idempotencyKey: options.idempotencyKey ?? null,
    },
  });
  return job.id;
}

export async function processPendingJobs(limit = 10): Promise<number> {
  const jobs = await prisma.jobQueue.findMany({
    where: {
      status: "pending",
      runAt: { lte: new Date() },
    },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const job of jobs) {
    await prisma.jobQueue.update({
      where: { id: job.id },
      data: { status: "running", startedAt: new Date() },
    });
    try {
      const { dispatchJob } = await import("@/lib/infra/job-handlers");
      await dispatchJob(job.type as JobType, job.fundId, job.payloadJson);
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date() },
      });
      recordMetric("job.completed", 1, { type: job.type });
      processed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "job_failed";
      logError("job", message, { jobId: job.id, type: job.type });
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: message,
          completedAt: new Date(),
        },
      });
    }
  }
  return processed;
}
