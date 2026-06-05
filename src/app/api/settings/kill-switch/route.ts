import { NextRequest, NextResponse } from "next/server";
import {
  isGlobalKillSwitchActive,
  setGlobalKillSwitch,
} from "@/lib/settings";
import { logRequest } from "@/lib/observability";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  const reqId = logRequest("GET /api/settings/kill-switch");
  const active = await isGlobalKillSwitchActive();
  return NextResponse.json({
    active,
    envOverride: process.env.ADMIN_KILL_SWITCH === "true",
    requestId: reqId,
  });
}

export async function PATCH(req: NextRequest) {
  const reqId = logRequest("PATCH /api/settings/kill-switch");
  const admin = requireAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error, requestId: reqId },
      { status: 403 }
    );
  }
  const body = await req.json();
  if (typeof body.active !== "boolean") {
    return NextResponse.json(
      { error: "active must be boolean", requestId: reqId },
      { status: 400 }
    );
  }
  if (process.env.ADMIN_KILL_SWITCH === "true") {
    return NextResponse.json(
      {
        error: "ENV ADMIN_KILL_SWITCH overrides UI — disable env flag first.",
        requestId: reqId,
      },
      { status: 403 }
    );
  }
  await setGlobalKillSwitch(body.active);
  return NextResponse.json({
    active: body.active,
    requestId: reqId,
  });
}
