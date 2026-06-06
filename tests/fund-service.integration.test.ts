import { describe, expect, it } from "vitest";
import { createFundFromPrompt, approveAndExecuteFund } from "@/lib/fund/service";

describe("fund service integration", () => {
  it("creates fund in pending_review without execution", async () => {
    const result = await createFundFromPrompt(
      "Create a medium-risk AI infrastructure fund for smoke test",
      { riskLevel: "medium", excludedAssets: ["DOGE"] }
    );
    expect(result.fund.status).toBe("pending_review");
    expect(result.execution).toBeNull();
    expect(result.fund.riskPolicy?.excludedAssetsJson).toContain("DOGE");
  });

  it("requires disclosure on approve", async () => {
    const { fund } = await createFundFromPrompt(
      "Create a low-risk conservative fund smoke test approval gate"
    );
    await expect(
      approveAndExecuteFund(fund.id, { disclosureAccepted: false })
    ).rejects.toThrow(/Disclosure/);
  });

  it("approves and executes with disclosure", async () => {
    const { fund } = await createFundFromPrompt(
      "Create a medium-risk narrative fund for approval smoke test"
    );
    const out = await approveAndExecuteFund(fund.id, {
      disclosureAccepted: true,
    });
    expect(out.execution.orders.length).toBeGreaterThan(0);
    expect(out.reconciliation.ordersChecked).toBeGreaterThanOrEqual(0);
  });
});
