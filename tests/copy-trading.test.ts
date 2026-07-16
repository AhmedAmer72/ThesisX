import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  followFund,
  unfollowFund,
  getFollowStatus,
  fanoutToFollowers,
  getPaperPortfolioBySlug,
  listPaperPortfolios,
  computePaperNav,
} from "@/lib/copy-trading";
import { createFundFromPrompt } from "@/lib/fund/service";

describe("copy trading", () => {
  it("creates durable follow record and paper portfolio snapshots", async () => {
    const user = await prisma.user.create({
      data: {
        walletAddress: `0x${Date.now().toString(16).padStart(40, "0").slice(0, 40)}`,
      },
    });
    const { fund } = await createFundFromPrompt(
      "Create a medium risk diversified fund for copy trading test"
    );

    const result = await followFund(fund.id, user.id, 50);
    expect(result.success).toBe(true);
    expect(result.followId).toBeTruthy();
    expect(result.fundSlug).toBe(fund.slug);

    const status = await getFollowStatus(fund.id, user.id);
    expect(status.following).toBe(true);
    expect(status.allocationPct).toBe(50);

    const portfolios = await listPaperPortfolios(user.id);
    expect(portfolios.length).toBe(1);
    expect(portfolios[0].fundSlug).toBe(fund.slug);
    expect(portfolios[0].paperNav).toBeCloseTo(
      computePaperNav(100_000, 50),
      0
    );

    const detail = await getPaperPortfolioBySlug(user.id, fund.slug);
    expect(detail).not.toBeNull();
    expect(detail!.allocations.length).toBeGreaterThan(0);
    expect(detail!.history.length).toBeGreaterThanOrEqual(1);
    expect(detail!.history[0].triggeredBy).toBe("follow");

    const fanout = await fanoutToFollowers(
      fund.id,
      [{ symbol: "ETH", name: "Ethereum", weight: 0.5 }],
      110_000,
      "execution"
    );
    expect(fanout.followerCount).toBe(1);
    expect(fanout.resolvedNav).toBe(110_000);

    const afterFanout = await getPaperPortfolioBySlug(user.id, fund.slug);
    expect(afterFanout!.history.some((h) => h.triggeredBy === "execution")).toBe(
      true
    );
    expect(afterFanout!.paperNav).toBeCloseTo(computePaperNav(110_000, 50), 0);

    await unfollowFund(fund.id, user.id);
    const after = await getFollowStatus(fund.id, user.id);
    expect(after.following).toBe(false);
  });
});
