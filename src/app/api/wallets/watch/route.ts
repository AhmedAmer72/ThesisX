import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWalletFromRequest, requireWalletUser } from "@/lib/auth/wallet";
import { userHasFeature } from "@/lib/entitlements";
import { logRequest } from "@/lib/observability";
import { isValidAddress } from "@/lib/wallet/utils";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/wallets/watch");
  const wallet = getWalletFromRequest(req);
  const auth = await requireWalletUser(wallet);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, requestId: reqId }, { status: 401 });
  }
  const watches = await prisma.walletWatch.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ watches, requestId: reqId });
}

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/wallets/watch");
  const wallet = getWalletFromRequest(req);
  const auth = await requireWalletUser(wallet);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, requestId: reqId }, { status: 401 });
  }
  const allowed = await userHasFeature(auth.userId, "advanced_intel");
  if (!allowed) {
    return NextResponse.json(
      { error: "Upgrade required for wallet watchlists", requestId: reqId },
      { status: 403 }
    );
  }
  const body = await req.json();
  const address = String(body.address ?? "").toLowerCase();
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "Invalid address", requestId: reqId }, { status: 400 });
  }
  const watch = await prisma.walletWatch.upsert({
    where: { userId_address: { userId: auth.userId, address } },
    create: {
      userId: auth.userId,
      address,
      label: body.label ?? null,
      chainId: Number(body.chainId ?? 1),
    },
    update: { label: body.label ?? null },
  });
  return NextResponse.json({ watch, requestId: reqId });
}
