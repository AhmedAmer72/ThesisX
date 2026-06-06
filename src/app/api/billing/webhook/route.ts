import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";

/**
 * Stripe webhook placeholder — wire STRIPE_WEBHOOK_SECRET in production.
 */
export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/billing/webhook");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Billing not configured", requestId: reqId },
      { status: 503 }
    );
  }

  const body = await req.text();
  let event: { type?: string; data?: { object?: { customer?: string; metadata?: { userId?: string }; plan?: string } } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload", requestId: reqId }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated") {
    const userId = event.data?.object?.metadata?.userId;
    const plan = event.data?.object?.plan ?? "pro";
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: String(plan) },
      });
    }
  }

  return NextResponse.json({ received: true, requestId: reqId });
}
