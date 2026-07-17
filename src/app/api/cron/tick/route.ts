import { NextRequest, NextResponse } from "next/server";
import { scheduleAutonomousJobs } from "@/lib/infra/scheduler";
import { processPendingJobs } from "@/lib/infra/queue";
import { requireCronOrAdmin } from "@/lib/auth/admin";
import { logRequest } from "@/lib/observability";
import { isCronSecretRequired } from "@/lib/buildathon";

/**
 * Autonomous OS heartbeat:
 * 1) enqueue intel / alerts / weekly / committee / reconcile jobs
 * 2) process the pending queue
 *
 * Vercel Cron: GET /api/cron/tick hourly (Authorization: Bearer CRON_SECRET)
 */
async function handle(req: NextRequest) {
  const reqId = logRequest("CRON /api/cron/tick");

  if (isCronSecretRequired() && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET required in buildathon mode", requestId: reqId },
      { status: 503 }
    );
  }

  const auth = requireCronOrAdmin(req);
  if (!auth.ok) {
    // Allow unauthenticated in local non-buildathon when CRON_SECRET unset
    if (process.env.CRON_SECRET || isCronSecretRequired()) {
      return NextResponse.json(
        { error: auth.error, requestId: reqId },
        { status: auth.status }
      );
    }
  }

  const scheduled = await scheduleAutonomousJobs();
  const processed = await processPendingJobs(40);

  return NextResponse.json({
    ok: true,
    fundsConsidered: scheduled.fundsConsidered,
    jobsEnqueued: scheduled.enqueued.length,
    jobsProcessed: processed,
    sample: scheduled.enqueued.slice(0, 8),
    requestId: reqId,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
