import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const enqueueJob = vi.fn(async (type: string, fundId: string) => `${type}-${fundId}`);
const findMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    fund: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

vi.mock("@/lib/infra/queue", () => ({
  enqueueJob: (...args: unknown[]) => enqueueJob(...args),
}));

describe("scheduleAutonomousJobs", () => {
  beforeEach(() => {
    enqueueJob.mockClear();
    findMany.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("enqueues intel, alerts, nav for pending funds and full cycle for active", async () => {
    findMany.mockResolvedValue([
      { id: "f-pending", status: "pending_review", userId: "u1", rebalanceCadence: "weekly" },
      { id: "f-active", status: "active", userId: "u1", rebalanceCadence: "daily" },
    ]);

    const { scheduleAutonomousJobs } = await import("@/lib/infra/scheduler");
    const summary = await scheduleAutonomousJobs();

    expect(summary.fundsConsidered).toBe(2);
    const typesForActive = enqueueJob.mock.calls
      .filter((c) => c[1] === "f-active")
      .map((c) => c[0]);
    expect(typesForActive).toContain("intelligence_refresh");
    expect(typesForActive).toContain("alert_delivery");
    expect(typesForActive).toContain("weekly_report");
    expect(typesForActive).toContain("committee_run");
    expect(typesForActive).toContain("reconcile_orders");

    const typesForPending = enqueueJob.mock.calls
      .filter((c) => c[1] === "f-pending")
      .map((c) => c[0]);
    expect(typesForPending).toContain("alert_delivery");
    expect(typesForPending).not.toContain("weekly_report");
  });
});
