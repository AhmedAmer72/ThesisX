import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = logRequest("GET /api/funds/[slug]");
  const { slug } = await params;
  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: {
      thesis: true,
      riskPolicy: true,
      agentVotes: { orderBy: { createdAt: "desc" } },
      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 5 },
      executionOrders: { orderBy: { createdAt: "desc" }, take: 20 },
      reasoningLogs: { orderBy: { createdAt: "desc" } },
      performancePoints: { orderBy: { createdAt: "desc" }, take: 30 },
      tradeIntents: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!fund) {
    return NextResponse.json({ error: "Not found", requestId: reqId }, { status: 404 });
  }
  return NextResponse.json({ fund, requestId: reqId });
}
