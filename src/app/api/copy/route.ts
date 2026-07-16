import { NextRequest, NextResponse } from "next/server";
import {
  followFund,
  unfollowFund,
  getFollowStatus,
} from "@/lib/copy-trading";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, resolveUserFromWallet } from "@/lib/auth/wallet";

async function requireUser(req: NextRequest) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) return { error: "Wallet required", status: 401 as const };
  const user = await resolveUserFromWallet(wallet);
  if (!user) return { error: "Connect wallet first", status: 404 as const };
  return { user };
}

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/copy");
  const fundId = req.nextUrl.searchParams.get("fundId");
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: auth.status }
    );
  }
  if (!fundId) {
    return NextResponse.json(
      { error: "fundId required", requestId: reqId },
      { status: 400 }
    );
  }
  const status = await getFollowStatus(fundId, auth.user.id);
  return NextResponse.json({ ...status, requestId: reqId });
}

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/copy");
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: auth.status }
    );
  }

  const body = await req.json();
  const fundId = body.fundId as string;
  if (!fundId) {
    return NextResponse.json(
      { error: "fundId required", requestId: reqId },
      { status: 400 }
    );
  }

  const fund = await prisma.fund.findUnique({ where: { id: fundId } });
  if (!fund?.isPublic) {
    return NextResponse.json(
      { error: "Fund not found or not public", requestId: reqId },
      { status: 404 }
    );
  }

  const action = (body.action as string) ?? "follow";
  if (action === "unfollow") {
    const result = await unfollowFund(fundId, auth.user.id);
    return NextResponse.json({ ...result, requestId: reqId });
  }

  const allocationPct =
    typeof body.allocationPct === "number" ? body.allocationPct : 100;
  const result = await followFund(fundId, auth.user.id, allocationPct);
  return NextResponse.json({
    ...result,
    portfolioPath: result.fundSlug
      ? `/dashboard/following/${result.fundSlug}`
      : null,
    requestId: reqId,
  });
}

export async function DELETE(req: NextRequest) {
  const reqId = logRequest("DELETE /api/copy");
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: auth.status }
    );
  }
  const fundId = req.nextUrl.searchParams.get("fundId");
  if (!fundId) {
    return NextResponse.json(
      { error: "fundId required", requestId: reqId },
      { status: 400 }
    );
  }
  const result = await unfollowFund(fundId, auth.user.id);
  return NextResponse.json({ ...result, requestId: reqId });
}
