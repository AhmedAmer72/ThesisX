import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, resolveUserFromWallet } from "@/lib/auth/wallet";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/notifications");
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet required", requestId: reqId }, { status: 401 });
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user) {
    return NextResponse.json({ error: "User not found", requestId: reqId }, { status: 404 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notifications, requestId: reqId });
}

export async function PATCH(req: NextRequest) {
  const reqId = logRequest("PATCH /api/notifications");
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet required", requestId: reqId }, { status: 401 });
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user) {
    return NextResponse.json({ error: "User not found", requestId: reqId }, { status: 404 });
  }

  const body = await req.json();
  const id = body.id as string;
  if (!id) {
    return NextResponse.json({ error: "id required", requestId: reqId }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  return NextResponse.json({ ok: true, requestId: reqId });
}
