import { prisma } from "@/lib/db";

import { sosoClient } from "@/lib/soso/client";

import { runInvestmentCommittee } from "@/lib/ai/committee";

import { RISK_PRESETS, inferRiskLevel } from "@/lib/risk/engine";

import { executeTradePlan } from "@/lib/sodex/client";
import { buildExecutionTradePlan } from "@/lib/sodex/trade-plan";
import { getFundPositions } from "@/lib/portfolio/positions";

import { reconcileFundExecution } from "@/lib/sodex/reconcile";

import { isGlobalKillSwitchActive } from "@/lib/settings";

import { logAiRun, logExecution } from "@/lib/observability";

import { slugify } from "@/lib/utils";

import { isLiveIntelligenceRequired } from "@/lib/soso/fetch";

import { fanoutToFollowers } from "@/lib/copy-trading";
import { priceMapFromIntel } from "@/lib/portfolio/mark-to-market";
import { isBuildathonMode } from "@/lib/buildathon";
import { isProductionMode } from "@/lib/production";
import { enqueueJob } from "@/lib/infra/queue";

import { generateSosoAlerts } from "@/lib/alerts/service";

import type {

  CreateFundOptions,

  ApproveFundOptions,

  ProposeRebalanceOptions,

} from "@/lib/fund/types";

import type { Allocation, RiskLevel } from "@/lib/types";



const CADENCE_MS: Record<string, number> = {

  daily: 24 * 60 * 60 * 1000,

  weekly: 7 * 24 * 60 * 60 * 1000,

};



export async function createFundFromPrompt(

  prompt: string,

  options: CreateFundOptions = {}

) {
  if ((isBuildathonMode() || isProductionMode()) && !options.userId) {
    throw new Error("Connect wallet before creating a fund.");
  }

  const intel = await sosoClient.buildIntelligencePacket({

    liveOnly: isLiveIntelligenceRequired(),

    useCache: true,

  });

  const riskLevel =

    options.riskLevel ?? (inferRiskLevel(prompt) as RiskLevel);

  const excluded = options.excludedAssets ?? [];



  const { result, riskChecks, approved } = await runInvestmentCommittee(

    prompt,

    intel,

    {

      riskLevel,

      excludedAssets: excluded,

      maxDrawdownPct: options.maxDrawdownPct,

    }

  );



  const limits = RISK_PRESETS[riskLevel];

  const maxDrawdown = options.maxDrawdownPct ?? limits.maxDrawdownPct;

  const rebalanceCadence =

    options.rebalanceCadence ??

    (prompt.toLowerCase().includes("weekly") ? "weekly" : "daily");



  const slug = slugify(result.fundName);



  const fund = await prisma.fund.create({

    data: {

      slug: `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,

      name: result.fundName,

      prompt,

      strategyType: result.strategyType,

      riskLevel,

      rebalanceCadence,

      status: "pending_review",

      isPublic: true,

      userId: options.userId,

      thesis: {

        create: {

          summary: result.thesis.summary,

          outlook: result.thesis.outlook,

          narratives: JSON.stringify(result.thesis.narratives),

          constraints: JSON.stringify(result.thesis.constraints),

          sourcesJson: JSON.stringify(intel.sources),

          intelPacketJson: JSON.stringify(intel),

          intelFetchedAt: new Date(intel.fetchedAt),

          confidence: result.confidence,

        },

      },

      riskPolicy: {

        create: {

          maxDrawdownPct: maxDrawdown,

          maxPositionPct: limits.maxPositionPct,

          maxSectorPct: limits.maxSectorPct,

          maxAssets: limits.maxAssets,

          excludedAssetsJson: JSON.stringify(excluded),

          killSwitch: false,

        },

      },

      portfolioSnapshots: {

        create: {

          allocationsJson: JSON.stringify(result.allocations),

          nav: 100000,

          confidence: result.confidence,

          rebalanceReason: "Initial deployment (pending approval)",

        },

      },

      agentVotes: {

        create: result.agentVotes.map((v) => ({

          agentName: v.agentName,

          stance: v.stance,

          confidence: v.confidence,

          rationale: v.rationale,

          sourcesJson: JSON.stringify(v.sources),

        })),

      },

      reasoningLogs: {

        create: [

          {

            type: "thesis",

            title: "Investment thesis generated",

            body: result.thesis.summary,

            metadataJson: JSON.stringify({ sources: intel.sources.length }),

          },

          {

            type: "committee",

            title: "Investment committee consensus",

            body: `Recommendation: ${result.executionRecommendation}. Confidence ${result.confidence}%. Awaiting user approval before execution.`,

            metadataJson: JSON.stringify({

              votes: result.agentVotes.length,

              committeeApproved: approved,

            }),

          },

        ],

      },

      performancePoints: {

        create: { nav: 100000, pnlPct: 0, drawdownPct: 0 },

      },

    },

    include: {

      thesis: true,

      agentVotes: true,

      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },

      riskPolicy: true,

    },

  });



  logAiRun(fund.id, "committee_complete", {

    approved,

    riskLevel,

    excludedCount: excluded.length,

    userId: options.userId,

  });



  const tradePlan = buildExecutionTradePlan(result.allocations, {
    prices: priceMapFromIntel(intel),
    useDelta: false,
  });

  const intent = await prisma.tradeIntent.create({

    data: {

      fundId: fund.id,

      ordersJson: JSON.stringify(tradePlan),

      status: approved ? "pending_review" : "blocked",

      kind: "initial",

      riskChecksJson: JSON.stringify(riskChecks),

      approvedAt: null,

    },

  });



  if (options.userId && !intel.demoMode) {

    await generateSosoAlerts(intel, fund.id, options.userId);

  }



  return {

    fund,

    intel,

    committee: result,

    riskChecks,

    approved,

    tradeIntentId: intent.id,

    execution: null,

  };

}



export async function approveAndExecuteFund(

  fundId: string,

  options: ApproveFundOptions = {}

) {

  if (!options.disclosureAccepted) {

    throw new Error(

      "Disclosure acceptance required before execution. Set disclosureAccepted: true."

    );

  }



  if (await isGlobalKillSwitchActive()) {

    throw new Error("Global kill switch is active — execution blocked.");

  }



  const fund = await prisma.fund.findUnique({

    where: { id: fundId },

    include: {

      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },

      tradeIntents: {

        where: { status: { in: ["pending_review", "pending_approval"] } },

        orderBy: { createdAt: "desc" },

        take: 1,

      },

      riskPolicy: true,
      thesis: true,
    },

  });

  if (!fund) throw new Error("Fund not found");

  if (fund.riskPolicy?.killSwitch) {

    throw new Error("Fund-level kill switch is active — execution blocked.");

  }



  const pendingIntent = fund.tradeIntents[0];

  if (pendingIntent?.status === "blocked") {

    throw new Error("Trade intent blocked by risk checks.");

  }



  const snapshot = fund.portfolioSnapshots[0];

  const allocations = snapshot

    ? (JSON.parse(snapshot.allocationsJson) as Allocation[])

    : [];



  let intelPacket = null as ReturnType<typeof JSON.parse> | null;
  if (fund.thesis?.intelPacketJson) {
    try {
      intelPacket = JSON.parse(fund.thesis.intelPacketJson);
    } catch {
      intelPacket = null;
    }
  }
  const intel = intelPacket as import("@/lib/types").MarketIntelligencePacket | null;
  const positions = await getFundPositions(fundId);
  const tradePlan = buildExecutionTradePlan(allocations, {
    prices: intel ? priceMapFromIntel(intel) : {},
    positions,
    useDelta: positions.length > 0,
  });

  const execution = await executeTradePlan(fundId, tradePlan);

  for (const o of execution.orders) {
    await prisma.executionOrder.create({
      data: {
        fundId,
        symbol: o.symbol,
        side: o.side,
        quantity: o.quantity,
        status: o.status,
        mode: execution.mode,
        externalRef: o.externalRef,
        nonce: o.nonce,
      },
    });
  }

  const now = new Date();

  if (pendingIntent) {

    await prisma.tradeIntent.update({

      where: { id: pendingIntent.id },

      data: { status: "executed", approvedAt: now, executedAt: now },

    });

  }



  await prisma.fund.update({

    where: { id: fundId },

    data: { status: "active" },

  });



  await prisma.reasoningLog.create({

    data: {

      fundId,

      type: "execution",

      title: "User-approved execution",

      body: execution.message,

      metadataJson: JSON.stringify({

        orders: execution.orders,

        disclosureAccepted: true,

      }),

    },

  });



  logExecution(fundId, "user_approved_execution", {

    orderCount: execution.orders.length,

    mode: execution.mode,

  });



  let intelForReconcile = null as import("@/lib/types").MarketIntelligencePacket | null;
  if (fund.thesis?.intelPacketJson) {
    try {
      intelForReconcile = JSON.parse(
        fund.thesis.intelPacketJson
      ) as import("@/lib/types").MarketIntelligencePacket;
    } catch {
      intelForReconcile = null;
    }
  }
  const reconciliation = await reconcileFundExecution(fundId, intelForReconcile);
  void enqueueJob("reconcile_orders", fundId, {
    idempotencyKey: `reconcile-${fundId}-${Date.now()}`,
  }).catch(() => undefined);

  if (snapshot) {

    await fanoutToFollowers(

      fundId,

      allocations,

      snapshot.nav,

      "execution",

      snapshot.id

    );

  }



  return { execution, reconciliation };

}



export async function proposeRebalance(

  fundId: string,

  options: ProposeRebalanceOptions = {}

) {

  const fund = await prisma.fund.findUnique({

    where: { id: fundId },

    include: {

      thesis: true,

      riskPolicy: true,

      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },

      rebalanceRuns: {

        where: { status: "pending_review" },

        take: 1,

      },

    },

  });

  if (!fund) throw new Error("Fund not found");

  if (fund.status !== "active") {

    throw new Error("Fund must be active to propose rebalance");

  }

  if (fund.rebalanceRuns.length > 0) {

    throw new Error("A rebalance proposal is already pending review");

  }

  if (fund.riskPolicy?.killSwitch) {

    throw new Error("Fund kill switch active — rebalance blocked");

  }



  const previousSnapshot = fund.portfolioSnapshots[0];

  const previousAllocations = previousSnapshot

    ? (JSON.parse(previousSnapshot.allocationsJson) as Allocation[])

    : [];



  const intel = await sosoClient.buildIntelligencePacket({

    liveOnly: isLiveIntelligenceRequired(),

    useCache: false,

  });



  const excluded = fund.riskPolicy

    ? (JSON.parse(fund.riskPolicy.excludedAssetsJson) as string[])

    : [];



  const { result, riskChecks, approved } = await runInvestmentCommittee(

    fund.prompt,

    intel,

    {

      riskLevel: fund.riskLevel as RiskLevel,

      excludedAssets: excluded,

      maxDrawdownPct: fund.riskPolicy?.maxDrawdownPct,

    }

  );



  const tradePlan = buildExecutionTradePlan(result.allocations, {
    prices: priceMapFromIntel(intel),
    useDelta: false,
  });

  const intentStatus = approved ? "pending_review" : "blocked";



  const intent = await prisma.tradeIntent.create({

    data: {

      fundId,

      ordersJson: JSON.stringify(tradePlan),

      status: intentStatus,

      kind: "rebalance",

      riskChecksJson: JSON.stringify(riskChecks),

    },

  });



  const rebalanceReason = `SoSo rebalance: risk-on ${intel.marketPulse?.riskOnScore ?? 0}/100 · ${intel.narratives.slice(0, 2).join("; ")}`;



  const run = await prisma.rebalanceRun.create({

    data: {

      fundId,

      tradeIntentId: intent.id,

      previousAllocationsJson: JSON.stringify(previousAllocations),

      proposedAllocationsJson: JSON.stringify(result.allocations),

      intelPacketJson: JSON.stringify(intel),

      agentVotesJson: JSON.stringify(result.agentVotes),

      status: intentStatus,

      triggeredBy: options.triggeredBy ?? "manual",

    },

  });



  await prisma.agentVote.createMany({

    data: result.agentVotes.map((v) => ({

      fundId,

      agentName: v.agentName,

      stance: v.stance,

      confidence: v.confidence,

      rationale: v.rationale,

      sourcesJson: JSON.stringify(v.sources),

    })),

  });



  if (options.persistIntel !== false && fund.thesis) {

    await prisma.fundThesis.update({

      where: { id: fund.thesis.id },

      data: {

        intelPacketJson: JSON.stringify(intel),

        intelFetchedAt: new Date(intel.fetchedAt),

        sourcesJson: JSON.stringify(intel.sources),

      },

    });

  }



  await prisma.reasoningLog.create({

    data: {

      fundId,

      type: "rebalance",

      title: "Rebalance proposal created",

      body: rebalanceReason,

      metadataJson: JSON.stringify({

        rebalanceRunId: run.id,

        approved,

        triggeredBy: options.triggeredBy ?? "manual",

      }),

    },

  });



  logAiRun(fundId, "rebalance_proposed", {

    rebalanceRunId: run.id,

    approved,

    triggeredBy: options.triggeredBy,

  });



  if (fund.userId && !intel.demoMode) {

    await generateSosoAlerts(intel, fundId, fund.userId);

    await prisma.notification.create({

      data: {

        userId: fund.userId,

        fundId,

        type: "rebalance_available",

        title: "New rebalance available",

        body: rebalanceReason,

        metadataJson: JSON.stringify({ rebalanceRunId: run.id }),

      },

    });

  }



  return {

    rebalanceRun: run,

    tradeIntentId: intent.id,

    intel,

    committee: result,

    riskChecks,

    approved,

  };

}



export async function approveRebalance(

  fundId: string,

  rebalanceRunId: string,

  options: ApproveFundOptions = {}

) {

  if (!options.disclosureAccepted) {

    throw new Error("Disclosure acceptance required before rebalance execution.");

  }

  if (await isGlobalKillSwitchActive()) {

    throw new Error("Global kill switch is active — execution blocked.");

  }



  const run = await prisma.rebalanceRun.findFirst({

    where: { id: rebalanceRunId, fundId },

    include: {

      tradeIntent: true,

      fund: { include: { riskPolicy: true, thesis: true } },

    },

  });

  if (!run) throw new Error("Rebalance run not found");

  if (run.status !== "pending_review") {

    throw new Error(`Rebalance status is ${run.status}, not pending_review`);

  }

  if (run.fund.riskPolicy?.killSwitch) {

    throw new Error("Fund kill switch active");

  }



  const allocations = JSON.parse(

    run.proposedAllocationsJson

  ) as Allocation[];

  let rebalanceIntel = null as import("@/lib/types").MarketIntelligencePacket | null;
  if (run.fund.thesis?.intelPacketJson) {
    try {
      rebalanceIntel = JSON.parse(
        run.fund.thesis.intelPacketJson
      ) as import("@/lib/types").MarketIntelligencePacket;
    } catch {
      rebalanceIntel = null;
    }
  }
  const positions = await getFundPositions(fundId);
  const tradePlan = buildExecutionTradePlan(allocations, {
    prices: rebalanceIntel ? priceMapFromIntel(rebalanceIntel) : {},
    positions,
    useDelta: positions.length > 0,
  });

  const execution = await executeTradePlan(fundId, tradePlan);

  for (const o of execution.orders) {
    await prisma.executionOrder.create({
      data: {
        fundId,
        symbol: o.symbol,
        side: o.side,
        quantity: o.quantity,
        status: o.status,
        mode: execution.mode,
        externalRef: o.externalRef,
        nonce: o.nonce,
      },
    });
  }

  const now = new Date();

  await prisma.rebalanceRun.update({

    where: { id: run.id },

    data: { status: "executed", executedAt: now },

  });

  if (run.tradeIntentId) {

    await prisma.tradeIntent.update({

      where: { id: run.tradeIntentId },

      data: { status: "executed", approvedAt: now, executedAt: now },

    });

  }



  const prevSnapshot = await prisma.portfolioSnapshot.findFirst({
    where: { fundId },
    orderBy: { createdAt: "desc" },
  });

  const agentVotes = JSON.parse(run.agentVotesJson) as {
    confidence?: number;
  }[];
  const avgConfidence =
    agentVotes.length > 0
      ? agentVotes.reduce((s, v) => s + (v.confidence ?? 0), 0) /
        agentVotes.length
      : 70;

  const latestSnapshot = await prisma.portfolioSnapshot.create({
    data: {
      fundId,
      allocationsJson: run.proposedAllocationsJson,
      nav: prevSnapshot?.nav ?? 100000,
      confidence: avgConfidence,
      rebalanceReason: `Executed rebalance ${run.id}`,
    },
  });

  await prisma.reasoningLog.create({

    data: {

      fundId,

      type: "rebalance",

      title: "Rebalance executed",

      body: execution.message,

      metadataJson: JSON.stringify({ rebalanceRunId: run.id }),

    },

  });



  logExecution(fundId, "rebalance_executed", {

    rebalanceRunId: run.id,

    orderCount: execution.orders.length,

  });



  const reconciliation = await reconcileFundExecution(fundId, rebalanceIntel);

  if (latestSnapshot) {
    await fanoutToFollowers(
      fundId,
      allocations,
      reconciliation.nav ?? latestSnapshot.nav,
      "rebalance",
      latestSnapshot.id
    );
  }

  return { execution, rebalanceRunId: run.id, reconciliation };

}



export async function rejectRebalance(fundId: string, rebalanceRunId: string) {

  const run = await prisma.rebalanceRun.findFirst({

    where: { id: rebalanceRunId, fundId },

  });

  if (!run) throw new Error("Rebalance run not found");

  if (run.status !== "pending_review") {

    throw new Error("Only pending rebalance can be rejected");

  }



  await prisma.rebalanceRun.update({

    where: { id: run.id },

    data: { status: "blocked" },

  });

  if (run.tradeIntentId) {

    await prisma.tradeIntent.update({

      where: { id: run.tradeIntentId },

      data: { status: "blocked" },

    });

  }



  await prisma.reasoningLog.create({

    data: {

      fundId,

      type: "rebalance",

      title: "Rebalance rejected",

      body: "User rejected the proposed rebalance.",

      metadataJson: JSON.stringify({ rebalanceRunId: run.id }),

    },

  });



  return { rejected: true };

}



export function isCadenceElapsed(

  cadence: string,

  lastRunAt: Date | null

): boolean {

  const ms = CADENCE_MS[cadence] ?? CADENCE_MS.daily;

  if (!lastRunAt) return true;

  return Date.now() - lastRunAt.getTime() >= ms;

}



export async function runScheduledRebalances() {

  const funds = await prisma.fund.findMany({

    where: { status: "active" },

    include: {
      rebalanceRuns: { orderBy: { createdAt: "desc" }, take: 1 },
    },

  });



  const results: { fundId: string; slug: string; status: string }[] = [];



  for (const fund of funds) {

    const pending = await prisma.rebalanceRun.findFirst({

      where: { fundId: fund.id, status: "pending_review" },

    });

    if (pending) {

      results.push({ fundId: fund.id, slug: fund.slug, status: "skipped_pending" });

      continue;

    }



    const lastRun = fund.rebalanceRuns[0];

    if (!isCadenceElapsed(fund.rebalanceCadence, lastRun?.createdAt ?? null)) {

      results.push({ fundId: fund.id, slug: fund.slug, status: "skipped_cadence" });

      continue;

    }



    try {

      await proposeRebalance(fund.id, { triggeredBy: "cron" });

      results.push({ fundId: fund.id, slug: fund.slug, status: "proposed" });

    } catch (e) {

      results.push({

        fundId: fund.id,

        slug: fund.slug,

        status: e instanceof Error ? e.message : "failed",

      });

    }

  }



  return results;

}



export async function getUserDashboard(userId: string) {

  const [createdFunds, follows, pendingRebalances, notifications] =

    await Promise.all([

      prisma.fund.findMany({

        where: { userId },

        orderBy: { updatedAt: "desc" },

        include: {

          portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },

          performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },

          tradeIntents: {

            where: { status: { in: ["pending_review", "pending_approval"] } },

            take: 1,

          },

          rebalanceRuns: {

            where: { status: "pending_review" },

            take: 1,

          },

        },

      }),

      prisma.fundFollow.findMany({

        where: { userId, status: "active" },

        include: {

          fund: {

            include: {

              performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },

            },

          },

        },

      }),

      prisma.rebalanceRun.findMany({

        where: {

          status: "pending_review",

          fund: { userId },

        },

        include: { fund: true },

        orderBy: { createdAt: "desc" },

      }),

      prisma.notification.findMany({

        where: { userId },

        orderBy: { createdAt: "desc" },

        take: 20,

      }),

    ]);



  const recentActions = await prisma.reasoningLog.findMany({

    where: { fund: { userId } },

    orderBy: { createdAt: "desc" },

    take: 10,

  });



  return {

    createdFunds,

    follows,

    pendingRebalances,

    notifications,

    recentActions,

  };

}



export { inferRiskLevel };


