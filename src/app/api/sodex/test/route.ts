import { NextResponse } from "next/server";
import { getSodexReadiness } from "@/lib/sodex/readiness";
import { getAccountId } from "@/lib/sodex/client";
import { logRequest } from "@/lib/observability";

export async function GET() {
  const reqId = logRequest("GET /api/sodex/test");
  const readiness = getSodexReadiness();
  const userAddress = process.env.SODEX_USER_ADDRESS;

  let accountResolved: number | null = null;
  if (userAddress && readiness.spotBase) {
    accountResolved = await getAccountId(userAddress, readiness.spotBase);
  }

  return NextResponse.json({
    ...readiness,
    accountResolved,
    userAddressConfigured: Boolean(userAddress),
    requestId: reqId,
  });
}
