import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { getWalletFromRequest, requireFundOwnerBySlug } from "@/lib/auth/wallet";

export async function PATCH(req: NextRequest) {
  const reqId = logRequest("PATCH /api/settings/fund-kill-switch");
  const body = await req.json();
  const slug = body.slug as string;
  const active = body.active as boolean;
  if (!slug || typeof active !== "boolean") {
    return NextResponse.json(
      { error: "slug and active (boolean) required", requestId: reqId },
      { status: 400 }
    );
  }

  const wallet = getWalletFromRequest(req);
  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: { riskPolicy: true },
  });
  if (!fund?.riskPolicy) {
    return NextResponse.json(
      { error: "Fund or risk policy not found", requestId: reqId },
      { status: 404 }
    );
  }

  if (fund.userId) {
    const auth = await requireFundOwnerBySlug(slug, wallet);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, requestId: reqId },
        { status: 403 }
      );
    }
  }

  await prisma.riskPolicy.update({
    where: { id: fund.riskPolicy.id },
    data: { killSwitch: active },
  });

  await prisma.auditLog.create({
    data: {
      level: "info",
      category: "kill_switch",
      message: `Fund kill switch ${active ? "enabled" : "disabled"}`,
      fundId: fund.id,
      metadataJson: JSON.stringify({ slug, wallet }),
    },
  });

  return NextResponse.json({ slug, killSwitch: active, requestId: reqId });
}
