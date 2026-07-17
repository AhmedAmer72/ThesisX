import { NextRequest, NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/infra/queue";
import { scheduleAutonomousJobs } from "@/lib/infra/scheduler";
import { requireCronOrAdmin } from "@/lib/auth/admin";
import { logRequest } from "@/lib/observability";

async function handle(req: NextRequest) {
  const reqId = logRequest("POST /api/jobs/run");
  const auth = requireCronOrAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: auth.status }
    );
  }

  let schedule = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      schedule = Boolean(
        (body as { schedule?: boolean }).schedule ??
          req.nextUrl.searchParams.get("schedule") === "true"
      );
    } else {
      schedule = req.nextUrl.searchParams.get("schedule") === "true";
    }
  } catch {
    schedule = req.nextUrl.searchParams.get("schedule") === "true";
  }

  const scheduled = schedule ? await scheduleAutonomousJobs() : null;
  const processed = await processPendingJobs(40);
  return NextResponse.json({
    processed,
    scheduled,
    requestId: reqId,
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
