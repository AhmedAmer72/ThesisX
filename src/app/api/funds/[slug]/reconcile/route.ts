import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reconcileFundExecution } from "@/lib/sodex/reconcile";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, requireFundOwnerBySlug } from "@/lib/auth/wallet";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("POST /api/funds/[slug]/reconcile");
  const { slug } = await params;
  const wallet = getWalletFromRequest(req);
  const owner = await requireFundOwnerBySlug(slug, wallet);
  if (!owner.ok) {
    return NextResponse.json(
      { error: owner.error, requestId: reqId },
      { status: 403 }
    );
  }
  const fund = await prisma.fund.findUnique({ where: { slug } });
  if (!fund) {
    return NextResponse.json(
      { error: "Not found", requestId: reqId },
      { status: 404 }
    );
  }
  const reconciliation = await reconcileFundExecution(fund.id);
  return NextResponse.json({ reconciliation, requestId: reqId });
}
