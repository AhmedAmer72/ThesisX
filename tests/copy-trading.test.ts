import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  followFund,
  unfollowFund,
  getFollowStatus,
  fanoutToFollowers,
} from "@/lib/copy-trading";
import { createFundFromPrompt } from "@/lib/fund/service";

describe("copy trading", () => {
  it("creates durable follow record and snapshot", async () => {
    const user = await prisma.user.create({
      data: { walletAddress: `0x${Date.now().toString(16).padStart(40, "0").slice(0, 40)}` },
    });
    const { fund } = await createFundFromPrompt(
      "Create a medium risk diversified fund for copy trading test"
    );

    const result = await followFund(fund.id, user.id, 50);
    expect(result.success).toBe(true);
    expect(result.followId).toBeTruthy();

    const status = await getFollowStatus(fund.id, user.id);
    expect(status.following).toBe(true);
    expect(status.allocationPct).toBe(50);

    const fanout = await fanoutToFollowers(
      fund.id,
      [{ symbol: "ETH", name: "Ethereum", weight: 0.5 }],
      100000,
      "execution"
    );
    expect(fanout.followerCount).toBe(1);

    await unfollowFund(fund.id, user.id);
    const after = await getFollowStatus(fund.id, user.id);
    expect(after.following).toBe(false);
  });
});
