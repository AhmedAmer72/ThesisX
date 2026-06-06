import { NextRequest, NextResponse } from "next/server";
import {
  flagsForPlan,
  parseFeatureFlags,
  unlockFeatureForUser,
} from "@/lib/entitlements";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, resolveUserFromWallet } from "@/lib/auth/wallet";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/entitlements");
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json({
      plan: "free",
      features: flagsForPlan("free"),
      mvpMode: true,
      requestId: reqId,
    });
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user) {
    return NextResponse.json({
      plan: "free",
      features: flagsForPlan("free"),
      mvpMode: true,
      requestId: reqId,
    });
  }

  const explicit = parseFeatureFlags(user.featureFlagsJson);
  const features =
    explicit.length > 0 ? explicit : flagsForPlan(user.plan);

  return NextResponse.json({
    userId: user.id,
    plan: user.plan,
    features,
    mvpMode: true,
    requestId: reqId,
  });
}

/** MVP: unlock a feature flag without payment (pricing CTA maps here). */
export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/entitlements");
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet required", requestId: reqId }, { status: 401 });
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user) {
    return NextResponse.json({ error: "Connect wallet first", requestId: reqId }, { status: 404 });
  }

  const body = await req.json();
  const feature = body.feature as string;
  const valid = flagsForPlan("free");
  if (!valid.includes(feature as (typeof valid)[number])) {
    return NextResponse.json({ error: "Invalid feature", requestId: reqId }, { status: 400 });
  }

  await unlockFeatureForUser(user.id, feature as (typeof valid)[number]);
  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  return NextResponse.json({
    plan: updated?.plan ?? "free",
    features: parseFeatureFlags(updated?.featureFlagsJson ?? "[]"),
    unlocked: feature,
    requestId: reqId,
  });
}
