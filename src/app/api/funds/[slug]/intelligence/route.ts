import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sosoClient } from "@/lib/soso/client";
import { logRequest } from "@/lib/observability";
import { isSosoSetupError } from "@/lib/soso/errors";
import { getWalletFromRequest, requireFundOwnerBySlug } from "@/lib/auth/wallet";
import type { MarketIntelligencePacket } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("GET /api/funds/[slug]/intelligence");
  const { slug } = await params;
  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: { thesis: true },
  });
  if (!fund) {
    return NextResponse.json(
      { error: "Not found", requestId: reqId },
      { status: 404 }
    );
  }

  let snapshot: MarketIntelligencePacket | null = null;
  if (fund.thesis?.intelPacketJson) {
    try {
      snapshot = JSON.parse(
        fund.thesis.intelPacketJson
      ) as MarketIntelligencePacket;
    } catch {
      snapshot = null;
    }
  }

  const refresh = req.nextUrl.searchParams.get("refresh") === "true";
  const chartHeavy = req.nextUrl.searchParams.get("charts") === "true";
  let live: MarketIntelligencePacket | null = null;
  if (refresh) {
    try {
      live = await sosoClient.buildIntelligencePacket({
        liveOnly: true,
        useCache: false,
        chartHeavy,
      });
    } catch (e) {
      if (isSosoSetupError(e)) {
        return NextResponse.json(
          {
            error: e.message,
            code: e.code,
            snapshot,
            sources: fund.thesis?.sourcesJson
              ? JSON.parse(fund.thesis.sourcesJson)
              : [],
            intelFetchedAt: fund.thesis?.intelFetchedAt,
            requestId: reqId,
          },
          { status: 503 }
        );
      }
      throw e;
    }
  }

  return NextResponse.json({
    fundSlug: slug,
    snapshot,
    live,
    sources: fund.thesis?.sourcesJson
      ? JSON.parse(fund.thesis.sourcesJson)
      : [],
    intelFetchedAt: fund.thesis?.intelFetchedAt,
    requestId: reqId,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("POST /api/funds/[slug]/intelligence");
  const { slug } = await params;
  const wallet = getWalletFromRequest(req);
  const auth = await requireFundOwnerBySlug(slug, wallet);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, requestId: reqId }, { status: 403 });
  }

  const body = await req.json();
  const intel = body.intelPacket as MarketIntelligencePacket;
  if (!intel?.fetchedAt) {
    return NextResponse.json(
      { error: "intelPacket with fetchedAt required", requestId: reqId },
      { status: 400 }
    );
  }

  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: { thesis: true },
  });
  if (!fund?.thesis) {
    return NextResponse.json({ error: "Not found", requestId: reqId }, { status: 404 });
  }

  await prisma.fundThesis.update({
    where: { id: fund.thesis.id },
    data: {
      intelPacketJson: JSON.stringify(intel),
      intelFetchedAt: new Date(intel.fetchedAt),
      sourcesJson: JSON.stringify(intel.sources ?? []),
    },
  });

  await prisma.auditLog.create({
    data: {
      level: "info",
      category: "intelligence",
      message: "Intel snapshot accepted by owner",
      fundId: fund.id,
      metadataJson: JSON.stringify({ modules: intel.moduleHealth?.length ?? 0 }),
    },
  });

  return NextResponse.json({ ok: true, requestId: reqId });
}
