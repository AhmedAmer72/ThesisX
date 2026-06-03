import { NextRequest, NextResponse } from "next/server";
import { getUserDashboard } from "@/lib/fund/service";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, resolveUserFromWallet } from "@/lib/auth/wallet";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/me/funds");
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet required (x-wallet-address header)", requestId: reqId },
      { status: 401 }
    );
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user) {
    return NextResponse.json(
      { error: "User not found — connect wallet first", requestId: reqId },
      { status: 404 }
    );
  }

  const dashboard = await getUserDashboard(user.id);
  return NextResponse.json({
    userId: user.id,
    walletAddress: user.walletAddress,
    plan: user.plan,
    ...dashboard,
    requestId: reqId,
  });
}
