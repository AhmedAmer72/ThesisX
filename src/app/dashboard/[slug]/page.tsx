import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { AllocationChart } from "@/components/fund/allocation-chart";
import { ReasoningTimeline } from "@/components/fund/reasoning-timeline";
import { ExecutionStepper } from "@/components/fund/execution-stepper";
import { WeeklyMemo } from "@/components/soso/weekly-memo";
import { IntelligencePanel } from "@/components/fund/intelligence-panel";
import { RebalancePanel } from "@/components/fund/rebalance-panel";
import { AllocationExplanation } from "@/components/fund/allocation-explanation";
import { SignalAllocationMap } from "@/components/soso/signal-allocation-map";
import { FundDashboardHeader } from "@/components/dashboard/fund-dashboard-header";
import { FundMetricGrid } from "@/components/dashboard/fund-metric-grid";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { NavChart } from "@/components/dashboard/nav-chart";
import { AiCopilotPanel } from "@/components/copilot/ai-copilot-panel";
import type { MarketIntelligencePacket } from "@/lib/types";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: {
      thesis: true,
      riskPolicy: true,
      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      performancePoints: { orderBy: { createdAt: "desc" }, take: 10 },
      reasoningLogs: { orderBy: { createdAt: "desc" }, take: 8 },
      executionOrders: { orderBy: { createdAt: "desc" }, take: 5 },
      agentVotes: { orderBy: { createdAt: "desc" }, take: 8 },
      rebalanceRuns: {
        where: { status: "pending_review" },
        orderBy: { createdAt: "desc" },
      },
      fundReports: { orderBy: { generatedAt: "desc" }, take: 5 },
    },
  });
  if (!fund) notFound();

  const allocations = fund.portfolioSnapshots[0]
    ? (JSON.parse(fund.portfolioSnapshots[0].allocationsJson) as {
        symbol: string;
        name: string;
        weight: number;
        sector?: string;
      }[])
    : [];

  let intelSnapshot: MarketIntelligencePacket | null = null;
  if (fund.thesis?.intelPacketJson) {
    try {
      intelSnapshot = JSON.parse(
        fund.thesis.intelPacketJson
      ) as MarketIntelligencePacket;
    } catch {
      intelSnapshot = null;
    }
  }

  const latestPerf = fund.performancePoints[0];
  const pnl = latestPerf?.pnlPct ?? 0;

  return (
    <div className="dashboard-page site-offset min-h-[70vh] bg-page-background pb-16">
      <div className="dashboard-inner container py-10 md:py-12">
        <FundDashboardHeader
          name={fund.name}
          slug={fund.slug}
          strategyType={fund.strategyType}
          riskLevel={fund.riskLevel}
          confidence={fund.thesis?.confidence ?? 0}
          status={fund.status}
        />

        <div className="mt-8">
          <FundMetricGrid
            metrics={[
              {
                label: "NAV",
                value: `$${(latestPerf?.nav ?? 100000).toLocaleString()}`,
              },
              {
                label: "PnL",
                value: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`,
                tone: pnl >= 0 ? "positive" : "negative",
              },
              {
                label: "Drawdown",
                value: `${((latestPerf?.drawdownPct ?? 0) * 100).toFixed(1)}%`,
                tone: (latestPerf?.drawdownPct ?? 0) > 0.1 ? "negative" : "default",
              },
              {
                label: "Cadence",
                value: fund.rebalanceCadence,
              },
            ]}
          />
        </div>

        <div className="mt-6">
          <DashboardPanel title="NAV performance">
            <NavChart
              points={fund.performancePoints.map((p) => ({
                date: p.createdAt.toISOString(),
                nav: p.nav,
                pnlPct: p.pnlPct,
              }))}
            />
          </DashboardPanel>
        </div>

        <div className="mt-6 grid lg:grid-cols-2 gap-5">
          <DashboardPanel title="Allocation">
            <AllocationChart allocations={allocations} showTitle={false} />
          </DashboardPanel>

          <DashboardPanel title="Risk & execution">
            {fund.riskPolicy && (
              <ul className="text-sm text-muted space-y-2 mb-6">
                <li>
                  Max position:{" "}
                  {(fund.riskPolicy.maxPositionPct * 100).toFixed(0)}%
                </li>
                <li>
                  Max sector: {(fund.riskPolicy.maxSectorPct * 100).toFixed(0)}%
                </li>
                <li>Max assets: {fund.riskPolicy.maxAssets}</li>
                <li>
                  Max drawdown:{" "}
                  {(fund.riskPolicy.maxDrawdownPct * 100).toFixed(0)}%
                </li>
              </ul>
            )}
            <ExecutionStepper currentStep={fund.status === "active" ? 4 : 2} />
          </DashboardPanel>
        </div>

        <div className="mt-6">
          <IntelligencePanel slug={fund.slug} initialSnapshot={intelSnapshot} />
        </div>

        {fund.status === "active" && (
          <div className="mt-6">
            <RebalancePanel
              slug={fund.slug}
              initialPending={fund.rebalanceRuns.map((r) => ({
                id: r.id,
                status: r.status,
                proposedAllocationsJson: r.proposedAllocationsJson,
                previousAllocationsJson: r.previousAllocationsJson,
                createdAt: r.createdAt.toISOString(),
              }))}
            />
          </div>
        )}

        <div className="mt-6">
          <AllocationExplanation
            votes={fund.agentVotes}
            rebalanceReason={fund.portfolioSnapshots[0]?.rebalanceReason}
          />
        </div>

        <div className="mt-6">
          <DashboardPanel title="SoSo signal map">
            <SignalAllocationMap
              intel={intelSnapshot}
              allocations={allocations}
            />
          </DashboardPanel>
        </div>

        <div className="mt-6">
          <DashboardPanel title="AI market copilot">
            <AiCopilotPanel fundId={fund.id} />
          </DashboardPanel>
        </div>

        <div className="mt-6 grid lg:grid-cols-2 gap-5">
          <DashboardPanel title="Reasoning timeline" className="lg:col-span-1">
            <ReasoningTimeline logs={fund.reasoningLogs} />
          </DashboardPanel>

          <DashboardPanel title="Weekly memo">
            <WeeklyMemo slug={fund.slug} />
          </DashboardPanel>
        </div>

        {fund.fundReports.length > 0 && (
          <div className="mt-6">
            <DashboardPanel title="Report history" count={fund.fundReports.length}>
              <ul className="space-y-2">
                {fund.fundReports.map((r) => {
                  let period = r.period;
                  try {
                    const content = JSON.parse(r.contentJson) as {
                      period?: string;
                    };
                    period = content.period ?? period;
                  } catch {
                    /* ignore */
                  }
                  return (
                    <li
                      key={r.id}
                      className="dashboard-row text-sm"
                    >
                      <span className="font-medium">{period}</span>
                      <span className="text-muted text-xs">
                        {new Date(r.generatedAt).toLocaleDateString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </DashboardPanel>
          </div>
        )}
      </div>
    </div>
  );
}
