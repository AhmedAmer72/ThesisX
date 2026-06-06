import { NextRequest, NextResponse } from "next/server";
import { runCopilotQuery } from "@/lib/ai/orchestrator";
import { sosoClient } from "@/lib/soso/client";
import { getWalletFromRequest, requireWalletUser } from "@/lib/auth/wallet";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { recordUsage } from "@/lib/billing/usage";
import { logRequest } from "@/lib/observability";
import { isLiveIntelligenceRequired } from "@/lib/soso/fetch";

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/copilot");
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`copilot:${ip}`, 30, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", requestId: reqId },
      { status: 429 }
    );
  }

  const wallet = getWalletFromRequest(req);
  const userAuth = await requireWalletUser(wallet);
  if (!userAuth.ok) {
    return NextResponse.json(
      { error: userAuth.error, requestId: reqId },
      { status: 401 }
    );
  }

  const body = await req.json();
  const query = String(body.query ?? "").trim();
  if (!query) {
    return NextResponse.json(
      { error: "query required", requestId: reqId },
      { status: 400 }
    );
  }

  const intel = await sosoClient.buildIntelligencePacket({
    liveOnly: isLiveIntelligenceRequired(),
    useCache: true,
  });

  const result = await runCopilotQuery(query, {
    fundId: body.fundId,
    userId: userAuth.userId,
    intel,
  });

  await recordUsage(userAuth.userId, "ai_copilot", 1, { queryLen: query.length });

  return NextResponse.json({ ...result, requestId: reqId });
}
