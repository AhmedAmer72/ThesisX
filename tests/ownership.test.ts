import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createFundFromPrompt } from "@/lib/fund/service";
import { requireFundOwner } from "@/lib/auth/wallet";

describe("fund ownership", () => {
  it("links fund to user on create", async () => {
    const wallet = `0x${Date.now().toString(16).padStart(40, "0").slice(0, 40)}`;
    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet },
      update: {},
    });
    const { fund } = await createFundFromPrompt(
      `Ownership test fund ${Date.now()} with wallet link`,
      { userId: user.id }
    );
    expect(fund.userId).toBe(user.id);

    const auth = await requireFundOwner(fund.id, wallet);
    expect(auth.ok).toBe(true);

    const denied = await requireFundOwner(fund.id, `0x${"b".repeat(40)}`);
    expect(denied.ok).toBe(false);
  });
});
