import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { reconcileFundExecution } from "@/lib/sodex/reconcile";
import { getWalletFromRequest, requireFundOwnerBySlug } from "@/lib/auth/wallet";
import { publishEvent } from "@/lib/realtime/event-bus";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("GET /api/funds/[slug]/orders");
  const { slug } = await params;
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  const wallet = getWalletFromRequest(req);

  const fund = await prisma.fund.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      userId: true,
      isPublic: true,
      executionOrders: {
        orderBy: { createdAt: "desc" },
        take: 40,
      },
    },
  });
  if (!fund) {
    return NextResponse.json(
      { error: "Not found", requestId: reqId },
      { status: 404 }
    );
  }

  // Owners can refresh/reconcile; public can read if fund is public
  let reconciliation = null as Awaited<
    ReturnType<typeof reconcileFundExecution>
  > | null;

  if (refresh && wallet) {
    const owner = await requireFundOwnerBySlug(slug, wallet);
    if (owner.ok) {
      reconciliation = await reconcileFundExecution(fund.id);
      await publishEvent(`fund:${fund.id}`, "order_tape", {
        ordersChecked: reconciliation.ordersChecked,
        updated: reconciliation.updated,
        nav: reconciliation.nav ?? null,
      });
    }
  } else if (!fund.isPublic && wallet) {
    const owner = await requireFundOwnerBySlug(slug, wallet);
    if (!owner.ok) {
      return NextResponse.json(
        { error: "Forbidden", requestId: reqId },
        { status: 403 }
      );
    }
  } else if (!fund.isPublic) {
    return NextResponse.json(
      { error: "Forbidden", requestId: reqId },
      { status: 403 }
    );
  }

  const orders = await prisma.executionOrder.findMany({
    where: { fundId: fund.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    fundId: fund.id,
    slug: fund.slug,
    orders: orders.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      quantity: o.quantity,
      status: o.status,
      mode: o.mode,
      externalRef: o.externalRef,
      nonce: o.nonce,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    reconciliation,
    requestId: reqId,
  });
}
