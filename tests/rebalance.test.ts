import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createFundFromPrompt,
  isCadenceElapsed,
} from "@/lib/fund/service";

describe("rebalance engine", () => {
  it("creates pending rebalance run record", async () => {
    const { fund } = await createFundFromPrompt(
      `Unique rebalance schema test fund ${Date.now()}`
    );

    const run = await prisma.rebalanceRun.create({
      data: {
        fundId: fund.id,
        previousAllocationsJson: "[]",
        proposedAllocationsJson: JSON.stringify([
          { symbol: "ETH", name: "Ethereum", weight: 0.6 },
        ]),
        status: "pending_review",
        triggeredBy: "manual",
      },
    });

    expect(run.status).toBe("pending_review");
    const pending = await prisma.rebalanceRun.findFirst({
      where: { fundId: fund.id, status: "pending_review" },
    });
    expect(pending?.id).toBe(run.id);
  });

  it("detects cadence elapsed", () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(isCadenceElapsed("weekly", old)).toBe(true);
    expect(isCadenceElapsed("weekly", new Date())).toBe(false);
  });
});
