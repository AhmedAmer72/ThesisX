import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReadinessState } from "@/lib/readiness";
import { logRequest } from "@/lib/observability";

export async function GET() {
  const reqId = logRequest("GET /api/metrics");
  const readiness = await getReadinessState();

  const [fundCount, activeFunds, orderCount, userCount, usage30d] =
    await Promise.all([
      prisma.fund.count({ where: { isSeeded: false } }),
      prisma.fund.count({ where: { status: "active", isSeeded: false } }),
      prisma.executionOrder.count({
        where: { status: { in: ["submitted", "filled", "reconciled"] } },
      }),
      prisma.user.count(),
      prisma.usageEvent.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

  return NextResponse.json({
    readiness,
    product: {
      funds: fundCount,
      activeFunds,
      executedOrders: orderCount,
      users: userCount,
      usageEvents30d: usage30d,
    },
    requestId: reqId,
  });
}
