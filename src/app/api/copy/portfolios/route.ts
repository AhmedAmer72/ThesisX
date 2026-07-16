import { NextRequest, NextResponse } from "next/server";
import { listPaperPortfolios } from "@/lib/copy-trading";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, resolveUserFromWallet } from "@/lib/auth/wallet";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/copy/portfolios");
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet required", requestId: reqId },
      { status: 401 }
    );
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user) {
    return NextResponse.json(
      { error: "Connect wallet first", requestId: reqId },
      { status: 404 }
    );
  }

  const portfolios = await listPaperPortfolios(user.id);
  return NextResponse.json({ portfolios, requestId: reqId });
}
