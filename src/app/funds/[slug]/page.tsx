import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { RiskBadge } from "@/components/fund/risk-badge";
import { AllocationChart } from "@/components/fund/allocation-chart";
import { AgentVotePanel } from "@/components/fund/agent-vote-panel";
import { ReasoningTimeline } from "@/components/fund/reasoning-timeline";
import { ExecutionStepper } from "@/components/fund/execution-stepper";
import { FollowFundButton } from "@/components/fund/follow-fund-button";
import { ResearchContext } from "@/components/soso/research-context";
import type { MarketIntelligencePacket } from "@/lib/types";

export default async function PublicFundPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fund = await prisma.fund.findUnique({
    where: { slug },
    include: {
      thesis: true,
      agentVotes: true,
      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      executionOrders: { orderBy: { createdAt: "desc" }, take: 10 },
      reasoningLogs: { orderBy: { createdAt: "desc" } },
      performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },
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

  const perf = fund.performancePoints[0];
  const points = await prisma.performancePoint.findMany({
    where: { fundId: fund.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const weekAgo = points.find(
    (p) =>
      perf &&
      perf.createdAt.getTime() - p.createdAt.getTime() >= 6 * 24 * 60 * 60 * 1000
  );
  const weeklyReturn =
    perf && weekAgo && weekAgo.nav > 0
      ? ((perf.nav - weekAgo.nav) / weekAgo.nav) * 100
      : perf?.pnlPct;

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

  return (
    <div className="site-offset container max-w-5xl py-10 md:py-14 bg-page-background">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Public AI Fund</p>
          <h1 className="text-4xl font-semibold tracking-tight mt-2">{fund.name}</h1>
          <p className="text-muted mt-2">{fund.strategyType}</p>
          <div className="mt-4">
            <RiskBadge
              riskLevel={fund.riskLevel}
              confidence={fund.thesis?.confidence ?? 84}
            />
          </div>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-6 min-w-[200px]">
          <p className="text-xs text-muted">Weekly return</p>
          <p
            className={`mt-1 text-3xl font-semibold ${
              (weeklyReturn ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {weeklyReturn != null
              ? `${weeklyReturn >= 0 ? "+" : ""}${weeklyReturn.toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-xs text-muted mt-4">NAV</p>
          <p className="text-lg font-medium">
            ${(perf?.nav ?? 100000).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-12 grid lg:grid-cols-2 gap-10">
        <div className="space-y-10">
          {fund.thesis && (
            <section className="bg-surface rounded-2xl border border-border p-6">
              <h2 className="font-semibold">Thesis</h2>
              <p className="text-sm mt-3 leading-relaxed">{fund.thesis.summary}</p>
              <p className="text-sm text-muted mt-3">{fund.thesis.outlook}</p>
            </section>
          )}
          <AllocationChart allocations={allocations} />
          <ResearchContext intel={intelSnapshot} />
          <FollowFundButton fundId={fund.id} />
        </div>
        <div className="space-y-10">
          <AgentVotePanel votes={fund.agentVotes} />
          <div>
            <p className="text-sm text-muted mb-3">Execution pipeline</p>
            <ExecutionStepper currentStep={fund.status === "active" ? 4 : 2} />
          </div>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
              Trade history
            </h2>
            <ul className="space-y-2 text-sm">
              {fund.executionOrders.length === 0 ? (
                <li className="text-muted">No executions yet.</li>
              ) : (
                fund.executionOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex justify-between py-2 border-b border-border/60"
                  >
                    <span>
                      {o.side.toUpperCase()} {o.quantity} {o.symbol}
                    </span>
                    <span className="text-muted capitalize">{o.status}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

      <div className="mt-16">
        <ReasoningTimeline logs={fund.reasoningLogs} />
      </div>
    </div>
  );
}
