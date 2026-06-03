import { NextRequest, NextResponse } from "next/server";
import { sosoClient } from "@/lib/soso/client";
import { logRequest } from "@/lib/observability";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/intelligence/health");
  const liveParam = req.nextUrl.searchParams.get("live");
  const live =
    liveParam === "true" ||
    (liveParam == null &&
      process.env.SOSO_HEALTH_LIVE === "true" &&
      process.env.NODE_ENV !== "test");
  const health = await sosoClient.getModuleHealth({ live });
  return NextResponse.json({
    ...health,
    liveRequired: true,
    requestId: reqId,
  });
}
