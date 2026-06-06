import { describe, expect, it } from "vitest";
import { createFundFromPrompt } from "@/lib/fund/service";
import { persistWeeklyReport, listFundReports } from "@/lib/reports/service";

describe("report persistence", () => {
  it("persists weekly report to database", async () => {
    const { fund, intel } = await createFundFromPrompt(
      "Create a medium risk fund for weekly report persistence test"
    );

    const { reportId } = await persistWeeklyReport({
      fundId: fund.id,
      fundName: fund.name,
      riskLevel: fund.riskLevel,
      rebalanceCadence: fund.rebalanceCadence,
      snapshot: intel,
    });

    expect(reportId).toBeTruthy();
    const history = await listFundReports(fund.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].report.fundName).toBe(fund.name);
  });
});
