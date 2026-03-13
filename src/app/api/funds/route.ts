import { NextRequest, NextResponse } from "next/server";

import { createFundFromPrompt } from "@/lib/fund/service";

import { prisma } from "@/lib/db";

import { logRequest } from "@/lib/observability";

import {
  getWalletFromRequest,
  requireWalletUser,
  resolveUserFromWallet,
} from "@/lib/auth/wallet";
import { isBuildathonMode } from "@/lib/buildathon";



export async function GET() {

  const reqId = logRequest("GET /api/funds");

  const funds = await prisma.fund.findMany({

    where: { isPublic: true },

    orderBy: { createdAt: "desc" },

    include: {

      thesis: true,

      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },

      performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },

      _count: { select: { fundFollows: true } },

    },

  });

  return NextResponse.json({ funds, requestId: reqId });

}



export async function POST(req: NextRequest) {

  const reqId = logRequest("POST /api/funds");

  try {

    const body = await req.json();

    const prompt = body.prompt as string;

    if (!prompt || prompt.length < 10) {

      return NextResponse.json(

        { error: "Prompt must be at least 10 characters", requestId: reqId },

        { status: 400 }

      );

    }



    const wallet =
      getWalletFromRequest(req) ??
      (typeof body.walletAddress === "string"
        ? body.walletAddress.toLowerCase()
        : null);

    if (isBuildathonMode()) {
      const auth = await requireWalletUser(wallet);
      if (!auth.ok) {
        return NextResponse.json(
          { error: auth.error, requestId: reqId },
          { status: 401 }
        );
      }
    }

    let userId: string | undefined;
    if (wallet) {
      const user = await resolveUserFromWallet(wallet);
      userId = user?.id;
    }



    const result = await createFundFromPrompt(prompt, {

      riskLevel: body.riskLevel,

      rebalanceCadence: body.rebalanceCadence,

      maxDrawdownPct:

        typeof body.maxDrawdownPct === "number"

          ? body.maxDrawdownPct

          : undefined,

      excludedAssets: Array.isArray(body.excludedAssets)

        ? body.excludedAssets

        : undefined,

      userId,

    });

    return NextResponse.json({
      fundId: result.fund.id,
      slug: result.fund.slug,
      approved: result.approved,
      status: result.fund.status,
      requiresApproval: true,
      demoMode: result.intel.demoMode,
      userId: result.fund.userId,
      committeeMode: result.committeeMeta.mode,
      committeeFallbackReason: result.committeeMeta.fallbackReason,
      requestId: reqId,
    });

  } catch (e) {

    return NextResponse.json(

      {

        error: e instanceof Error ? e.message : "Failed to create fund",

        requestId: reqId,

      },

      { status: 500 }

    );

  }

}


