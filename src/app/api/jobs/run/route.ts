import { NextRequest, NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/infra/queue";
import { requireCronOrAdmin } from "@/lib/auth/admin";
import { logRequest } from "@/lib/observability";

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/jobs/run");
  const auth = requireCronOrAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: auth.status }
    );
  }
  const processed = await processPendingJobs(25);
  return NextResponse.json({ processed, requestId: reqId });
}
