import { NextRequest, NextResponse } from "next/server";
import { buildAuthMessage, createNonce } from "@/lib/auth/session";
import { storeNonce } from "@/lib/auth/nonce-store";
import { isValidAddress } from "@/lib/wallet/utils";
import { logRequest } from "@/lib/observability";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/wallet/nonce");
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: "Valid address required", requestId: reqId },
      { status: 400 }
    );
  }
  const lower = address.toLowerCase();
  const nonce = createNonce();
  await storeNonce(lower, nonce);
  const message = buildAuthMessage(lower, nonce);
  return NextResponse.json({ nonce, message, requestId: reqId });
}
