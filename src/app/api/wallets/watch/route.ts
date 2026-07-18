import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWalletFromRequest, requireWalletUser } from "@/lib/auth/wallet";
import { userHasFeature } from "@/lib/entitlements";
import { normalizePlan, PLAN_LIMITS } from "@/lib/billing/plans";
import { logRequest } from "@/lib/observability";
import { isValidAddress } from "@/lib/wallet/utils";

async function watchLimitForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const plan = normalizePlan(user?.plan ?? "free");
  const hasAdvanced = await userHasFeature(userId, "advanced_intel");
  if (hasAdvanced) return PLAN_LIMITS[plan].watchedWallets;
  // Free tier: allow 1 watch without Pro unlock
  return Math.max(1, PLAN_LIMITS.free.watchedWallets);
}

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/wallets/watch");
  const wallet = getWalletFromRequest(req);
  const auth = await requireWalletUser(wallet);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: 401 }
    );
  }
  const watches = await prisma.walletWatch.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });
  const limit = await watchLimitForUser(auth.userId);
  const hasAdvanced = await userHasFeature(auth.userId, "advanced_intel");
  return NextResponse.json({
    watches,
    limit,
    hasAdvancedIntel: hasAdvanced,
    requestId: reqId,
  });
}

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/wallets/watch");
  const wallet = getWalletFromRequest(req);
  const auth = await requireWalletUser(wallet);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: 401 }
    );
  }

  const body = await req.json();
  const address = String(body.address ?? "").toLowerCase();
  if (!isValidAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address", requestId: reqId },
      { status: 400 }
    );
  }

  const existing = await prisma.walletWatch.findUnique({
    where: { userId_address: { userId: auth.userId, address } },
  });

  if (!existing) {
    const count = await prisma.walletWatch.count({
      where: { userId: auth.userId },
    });
    const limit = await watchLimitForUser(auth.userId);
    if (count >= limit) {
      return NextResponse.json(
        {
          error: `Watch limit reached (${limit}). Unlock advanced intel for more slots.`,
          code: "watch_limit",
          limit,
          requestId: reqId,
        },
        { status: 403 }
      );
    }
  }

  const watch = await prisma.walletWatch.upsert({
    where: { userId_address: { userId: auth.userId, address } },
    create: {
      userId: auth.userId,
      address,
      label: typeof body.label === "string" ? body.label : null,
      chainId: Number(body.chainId ?? 138565),
    },
    update: {
      label: typeof body.label === "string" ? body.label : undefined,
    },
  });
  return NextResponse.json({ watch, requestId: reqId });
}

export async function DELETE(req: NextRequest) {
  const reqId = logRequest("DELETE /api/wallets/watch");
  const wallet = getWalletFromRequest(req);
  const auth = await requireWalletUser(wallet);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, requestId: reqId },
      { status: 401 }
    );
  }

  const id = req.nextUrl.searchParams.get("id");
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!id && !address) {
    return NextResponse.json(
      { error: "id or address required", requestId: reqId },
      { status: 400 }
    );
  }

  await prisma.walletWatch.deleteMany({
    where: {
      userId: auth.userId,
      ...(id ? { id } : { address: address! }),
    },
  });
  return NextResponse.json({ ok: true, requestId: reqId });
}
