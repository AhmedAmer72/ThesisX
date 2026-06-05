import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWalletFromRequest, requireFundOwner } from "@/lib/auth/wallet";
import { requireAdmin } from "@/lib/auth/admin";
import { logRequest } from "@/lib/observability";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/audit");
  const wallet = getWalletFromRequest(req);
  const fundId = req.nextUrl.searchParams.get("fundId");
  if (fundId) {
    const auth = await requireFundOwner(fundId, wallet);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, requestId: reqId },
        { status: 403 }
      );
    }
  } else {
    const admin = requireAdmin(req);
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.error, requestId: reqId },
        { status: 403 }
      );
    }
  }
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 30), 100);

  const logs = await prisma.auditLog.findMany({
    where: fundId ? { fundId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const reasoning = fundId
    ? await prisma.reasoningLog.findMany({
        where: { fundId },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
    : [];

  return NextResponse.json({
    wallet,
    auditLogs: logs,
    reasoningLogs: reasoning,
    requestId: reqId,
  });
}
