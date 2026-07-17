import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, resolveUserFromWallet } from "@/lib/auth/wallet";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/notifications");
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
      { error: "User not found", requestId: reqId },
      { status: 404 }
    );
  }

  const type = req.nextUrl.searchParams.get("type");
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(type ? { type } : {}),
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      fund: { select: { slug: true, name: true } },
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({
    notifications,
    unreadCount,
    requestId: reqId,
  });
}

export async function PATCH(req: NextRequest) {
  const reqId = logRequest("PATCH /api/notifications");
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
      { error: "User not found", requestId: reqId },
      { status: 404 }
    );
  }

  const body = await req.json();
  if (body.markAllRead === true) {
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({
      ok: true,
      marked: result.count,
      requestId: reqId,
    });
  }

  const id = body.id as string;
  if (!id) {
    return NextResponse.json(
      { error: "id or markAllRead required", requestId: reqId },
      { status: 400 }
    );
  }

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  return NextResponse.json({ ok: true, requestId: reqId });
}
