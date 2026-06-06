import { describe, expect, it } from "vitest";
import { buildWeeklyReport } from "@/lib/soso/weekly-report";
import { getDemoIntelligencePacket } from "@/lib/soso/demo-data";

describe("weekly report", () => {
  it("builds report from snapshot", async () => {
    const snapshot = getDemoIntelligencePacket();
    const report = await buildWeeklyReport({
      fundName: "Test Fund",
      riskLevel: "medium",
      rebalanceCadence: "weekly",
      thesisSummary: "Summary",
      thesisOutlook: "Outlook",
      snapshot,
    });
    expect(report.fundName).toBe("Test Fund");
    expect(report.sosoHighlights.length).toBeGreaterThan(0);
    expect(report.period).toBe("weekly");
  });
});
