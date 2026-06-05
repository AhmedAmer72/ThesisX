import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

import { approveAndExecuteFund } from "@/lib/fund/service";

import { logRequest, logError } from "@/lib/observability";

import { getWalletFromRequest, requireFundOwnerBySlug } from "@/lib/auth/wallet";



export async function POST(

  req: NextRequest,

  { params }: { params: Promise<{ slug: string }> }

) {

  const reqId = logRequest("POST /api/funds/[slug]/approve");

  const { slug } = await params;

  const fund = await prisma.fund.findUnique({ where: { slug } });

  if (!fund) {

    return NextResponse.json(

      { error: "Not found", requestId: reqId },

      { status: 404 }

    );

  }



  const wallet = getWalletFromRequest(req);

  const auth = await requireFundOwnerBySlug(slug, wallet);

  if (!auth.ok) {

    return NextResponse.json(

      { error: auth.error, requestId: reqId },

      { status: 403 }

    );

  }



  let body: { disclosureAccepted?: boolean } = {};

  try {

    body = await req.json();

  } catch {

    body = {};

  }



  if (!body.disclosureAccepted) {

    return NextResponse.json(

      {

        error:

          "You must accept the risk disclosure before execution (disclosureAccepted: true).",

        requestId: reqId,

      },

      { status: 400 }

    );

  }



  try {

    const result = await approveAndExecuteFund(fund.id, {

      disclosureAccepted: true,

    });

    return NextResponse.json({ ...result, requestId: reqId });

  } catch (e) {

    logError("approve", e instanceof Error ? e.message : "approve_failed", {

      slug,

    });

    return NextResponse.json(

      {

        error: e instanceof Error ? e.message : "Approval failed",

        requestId: reqId,

      },

      { status: 400 }

    );

  }

}


