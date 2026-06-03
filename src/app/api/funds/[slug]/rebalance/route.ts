import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  proposeRebalance,
  approveRebalance,
  rejectRebalance,
} from "@/lib/fund/service";
import { logRequest, logError } from "@/lib/observability";
import { getWalletFromRequest, requireFundOwnerBySlug } from "@/lib/auth/wallet";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("GET /api/funds/[slug]/rebalance");
  const { slug } = await params;
  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: {
      rebalanceRuns: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { tradeIntent: true },
      },
    },
  });
  if (!fund) {
    return NextResponse.json({ error: "Not found", requestId: reqId }, { status: 404 });
  }
  return NextResponse.json({
    slug,
    pending: fund.rebalanceRuns.filter((r) => r.status === "pending_review"),
    history: fund.rebalanceRuns,
    requestId: reqId,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("POST /api/funds/[slug]/rebalance");
  const { slug } = await params;
  const wallet = getWalletFromRequest(req);
  const auth = await requireFundOwnerBySlug(slug, wallet);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, requestId: reqId }, { status: 403 });
  }

  let body: {
    action?: "propose" | "approve" | "reject";
    rebalanceRunId?: string;
    disclosureAccepted?: boolean;
    persistIntel?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = { action: "propose" };
  }

  const action = body.action ?? "propose";

  try {
    if (action === "propose") {
      const result = await proposeRebalance(auth.fundId, {
        triggeredBy: "manual",
        persistIntel: body.persistIntel,
      });
      return NextResponse.json({ ...result, requestId: reqId });
    }
    if (action === "approve") {
      if (!body.rebalanceRunId) {
        return NextResponse.json(
          { error: "rebalanceRunId required", requestId: reqId },
          { status: 400 }
        );
      }
      if (!body.disclosureAccepted) {
        return NextResponse.json(
          { error: "disclosureAccepted required", requestId: reqId },
          { status: 400 }
        );
      }
      const result = await approveRebalance(
        auth.fundId,
        body.rebalanceRunId,
        { disclosureAccepted: true }
      );
      return NextResponse.json({ ...result, requestId: reqId });
    }
    if (action === "reject") {
      if (!body.rebalanceRunId) {
        return NextResponse.json(
          { error: "rebalanceRunId required", requestId: reqId },
          { status: 400 }
        );
      }
      const result = await rejectRebalance(auth.fundId, body.rebalanceRunId);
      return NextResponse.json({ ...result, requestId: reqId });
    }
    return NextResponse.json(
      { error: "Invalid action", requestId: reqId },
      { status: 400 }
    );
  } catch (e) {
    logError("rebalance", e instanceof Error ? e.message : "rebalance_failed", {
      slug,
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Rebalance failed", requestId: reqId },
      { status: 400 }
    );
  }
}
