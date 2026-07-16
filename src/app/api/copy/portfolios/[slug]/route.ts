import { NextRequest, NextResponse } from "next/server";
import { getPaperPortfolioBySlug } from "@/lib/copy-trading";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, resolveUserFromWallet } from "@/lib/auth/wallet";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("GET /api/copy/portfolios/[slug]");
  const { slug } = await params;
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

  const portfolio = await getPaperPortfolioBySlug(user.id, slug);
  if (!portfolio) {
    return NextResponse.json(
      { error: "Paper portfolio not found — follow this fund first", requestId: reqId },
      { status: 404 }
    );
  }

  return NextResponse.json({ portfolio, requestId: reqId });
}
