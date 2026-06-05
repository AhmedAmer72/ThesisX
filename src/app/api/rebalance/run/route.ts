import { NextRequest, NextResponse } from "next/server";
import { runScheduledRebalances } from "@/lib/fund/service";
import { logRequest } from "@/lib/observability";
import { isCronSecretRequired } from "@/lib/buildathon";

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/rebalance/run");
  const cronSecret = process.env.CRON_SECRET;

  if (isCronSecretRequired() && !cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET required in buildathon mode", requestId: reqId },
      { status: 503 }
    );
  }

  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized", requestId: reqId },
        { status: 401 }
      );
    }
  }


  const results = await runScheduledRebalances();

  return NextResponse.json({ results, requestId: reqId });

}



export async function GET(req: NextRequest) {

  return POST(req);

}


