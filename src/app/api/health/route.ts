import { NextResponse } from "next/server";
import { getReadinessState } from "@/lib/readiness";
import { logRequest } from "@/lib/observability";

export async function GET() {
  const reqId = logRequest("GET /api/health");
  const readiness = await getReadinessState();
  return NextResponse.json({
    status: readiness.ready ? "ok" : "degraded",
    ...readiness,
    db: readiness.database,
    sosoConfigured: readiness.sosoLive,
    sosoLiveRequired: true,
    openaiConfigured: readiness.openai,
    requestId: reqId,
  });
}
