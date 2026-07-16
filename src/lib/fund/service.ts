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

import { fanoutToFollowers, listPaperPortfolios } from "@/lib/copy-trading";
import { priceMapFromIntel } from "@/lib/portfolio/mark-to-market";
import { getExecutionMode, isBuildathonMode } from "@/lib/buildathon";
import { isProductionMode } from "@/lib/production";
import { getSodexReadiness } from "@/lib/sodex/readiness";
import {
  isApprovalSignatureRequired,
  verifyApprovalSignature,
  type ApprovalAction,
} from "@/lib/auth/approval";
import { enqueueJob } from "@/lib/infra/queue";
import { publishEvent } from "@/lib/realtime/event-bus";

import { generateSosoAlerts } from "@/lib/alerts/service";
import { FundSetupError } from "@/lib/fund/errors";
import {
  filterTradableAllocations,
  listUnmappedAllocationSymbols,
  listUnpricedAllocationSymbols,
} from "@/lib/sodex/tradable";
import type { MarketIntelligencePacket } from "@/lib/types";

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

function isSuccessfulOrderStatus(status: string): boolean {
  return ["submitted", "filled", "filled_simulated", "reconciled"].includes(
    status
  );
}

async function assertWalletApproval(
  slug: string,
  walletAddress: string,
  options: ApproveFundOptions,
  action: ApprovalAction,
  intentId: string
) {
  if (!isApprovalSignatureRequired()) return;
  if (
    !options.approvalSignature ||
    !options.approvalTimestamp ||
    !options.intentId
  ) {
    throw new Error(
      "Wallet approval signature required. Confirm in your wallet to proceed."
    );
  }
  if (options.intentId !== intentId) {
    throw new Error("Approval intent mismatch");
  }
  const verified = await verifyApprovalSignature({
    address: walletAddress,
    action,
    slug,
    intentId: options.intentId,
    timestamp: options.approvalTimestamp,
    signature: options.approvalSignature,
  });
  if (!verified.ok) throw new Error(verified.error);
}

function assertSodexReadyForExecution(): void {
  const mode = getExecutionMode();
  if (mode !== "testnet" && mode !== "mainnet") return;
  const sodex = getSodexReadiness();
  if (!sodex.ready) {
    throw new Error(
      `SoDEX testnet not configured: ${[...sodex.blockers, ...sodex.warnings].join("; ")}`
    );
  }
}

function assertExecutionProducedOrders(
  execution: Awaited<ReturnType<typeof executeTradePlan>>
): void {
  const mode = getExecutionMode();
  if (mode === "mock") return;
  const successful = execution.orders.filter((o) =>
    isSuccessfulOrderStatus(o.status)
  );
  if (successful.length === 0) {
    throw new Error(
      execution.message ||
        "Execution produced no orders. Configure SoDEX credentials in Settings."
    );
  }
}

function assertTradableAllocations(
  allocations: Allocation[],
  intel: MarketIntelligencePacket,
  limits: (typeof RISK_PRESETS)[RiskLevel]
): Allocation[] {
  const prices = priceMapFromIntel(intel);
  const sanitized = filterTradableAllocations(allocations, prices, limits);
  const nonStable = sanitized.filter(
    (a) => !["USDC", "USDT", "DAI"].includes(a.symbol.toUpperCase())
  );
  if (nonStable.length === 0) {
    const unmapped = listUnmappedAllocationSymbols(allocations);
    const unpriced = listUnpricedAllocationSymbols(allocations, prices);
    throw new FundSetupError(
      "No tradable assets with live SoSo prices and SoDEX mappings. Check Settings → SoDEX setup.",
      "no_tradable_assets",
      {
        unmapped,
        unpriced,
        tradableSymbols: Object.keys(prices).filter((s) => !["USDC", "USDT", "DAI"].includes(s)),
      }
    );
  }
  return sanitized;
}

async function resolveExecutionIntel(
  storedJson?: string | null
): Promise<MarketIntelligencePacket | null> {
  if (isLiveIntelligenceRequired()) {
    try {
      return await sosoClient.buildIntelligencePacket({
        liveOnly: true,
        useCache: true,
      });
    } catch {
      // fall through to stored intel
    }
  }
  if (!storedJson) return null;
  try {
    return JSON.parse(storedJson) as MarketIntelligencePacket;
  } catch {
    return null;
  }
}



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



  const { result, riskChecks, approved, meta: committeeMeta } =
    await runInvestmentCommittee(prompt, intel, {
      riskLevel,
      excludedAssets: excluded,
      maxDrawdownPct: options.maxDrawdownPct,
    });

  const limits = RISK_PRESETS[riskLevel];
  const sanitizedAllocations = assertTradableAllocations(
    result.allocations,
    intel,
    limits
  );
  result.allocations = sanitizedAllocations;

  const tradePlan = buildExecutionTradePlan(sanitizedAllocations, {
    prices: priceMapFromIntel(intel),
    useDelta: false,
  });

  const maxDrawdown = options.maxDrawdownPct ?? limits.maxDrawdownPct;

  const rebalanceCadence =

    options.rebalanceCadence ??

    (prompt.toLowerCase().includes("weekly") ? "weekly" : "daily");



  const slug = slugify(result.fundName);

  const fundSlug = `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const txResult = await prisma.$transaction(async (tx) => {
    const created = await tx.fund.create({

    data: {

      slug: fundSlug,

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

          allocationsJson: JSON.stringify(sanitizedAllocations),

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

    const intent = await tx.tradeIntent.create({

      data: {

        fundId: created.id,

        ordersJson: JSON.stringify(tradePlan),

        status: approved ? "pending_review" : "blocked",

        kind: "initial",

        riskChecksJson: JSON.stringify(riskChecks),

        approvedAt: null,

      },

    });

    return { fund: created, intent };
  });

  const fund = txResult.fund;
  const intent = txResult.intent;

  logAiRun(fund.id, "committee_complete", {

    approved,

    riskLevel,

    excludedCount: excluded.length,

    userId: options.userId,

  });



  if (options.userId && !intel.demoMode) {

    await generateSosoAlerts(intel, fund.id, options.userId);

  }



  return {
    fund,
    intel,
    committee: result,
    committeeMeta,
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

  if (!pendingIntent) {
    throw new Error("No pending trade intent to approve.");
  }

  const walletAddress = options.walletAddress?.toLowerCase();
  if (!walletAddress) {
    throw new Error("Wallet address required for approval.");
  }

  await assertWalletApproval(
    fund.slug,
    walletAddress,
    options,
    "fund_execute",
    pendingIntent.id
  );

  assertSodexReadyForExecution();

  const snapshot = fund.portfolioSnapshots[0];

  const allocations = snapshot

    ? (JSON.parse(snapshot.allocationsJson) as Allocation[])

    : [];



  const intel = await resolveExecutionIntel(fund.thesis?.intelPacketJson);
  const limits = RISK_PRESETS[fund.riskLevel as RiskLevel];
  const sanitizedAllocations = intel
    ? assertTradableAllocations(allocations, intel, limits)
    : allocations;
  const positions = await getFundPositions(fundId);
  const tradePlan = buildExecutionTradePlan(sanitizedAllocations, {
    prices: intel ? priceMapFromIntel(intel) : {},
    positions,
    useDelta: positions.length > 0,
  });

  const execution = await executeTradePlan(fundId, tradePlan);

  assertExecutionProducedOrders(execution);

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

  await publishEvent(`fund:${fundId}`, "orders_submitted", {
    count: execution.orders.length,
    mode: execution.mode,
    message: execution.message,
  });

  const now = new Date();

  await prisma.tradeIntent.update({

    where: { id: pendingIntent.id },

    data: { status: "executed", approvedAt: now, executedAt: now },

  });



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
      sanitizedAllocations,
      reconciliation.nav ?? snapshot.nav,
      "execution",
      snapshot.id,
      intelForReconcile
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

  const limits = RISK_PRESETS[fund.riskLevel as RiskLevel];
  const sanitizedAllocations = assertTradableAllocations(
    result.allocations,
    intel,
    limits
  );
  result.allocations = sanitizedAllocations;

  const tradePlan = buildExecutionTradePlan(sanitizedAllocations, {
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

  const walletAddress = options.walletAddress?.toLowerCase();
  if (!walletAddress) {
    throw new Error("Wallet address required for rebalance approval.");
  }

  const fundRecord = await prisma.fund.findUnique({ where: { id: fundId } });
  if (!fundRecord) throw new Error("Fund not found");

  await assertWalletApproval(
    fundRecord.slug,
    walletAddress,
    options,
    "rebalance_execute",
    run.id
  );

  assertSodexReadyForExecution();

  const allocations = JSON.parse(

    run.proposedAllocationsJson

  ) as Allocation[];

  const rebalanceIntel =
    (await resolveExecutionIntel(run.intelPacketJson)) ??
    (await resolveExecutionIntel(run.fund.thesis?.intelPacketJson));
  const limits = RISK_PRESETS[run.fund.riskLevel as RiskLevel];
  const sanitizedAllocations = rebalanceIntel
    ? assertTradableAllocations(allocations, rebalanceIntel, limits)
    : allocations;
  const positions = await getFundPositions(fundId);
  const tradePlan = buildExecutionTradePlan(sanitizedAllocations, {
    prices: rebalanceIntel ? priceMapFromIntel(rebalanceIntel) : {},
    positions,
    useDelta: positions.length > 0,
  });

  const execution = await executeTradePlan(fundId, tradePlan);

  assertExecutionProducedOrders(execution);

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

  await publishEvent(`fund:${fundId}`, "orders_submitted", {
    count: execution.orders.length,
    mode: execution.mode,
    kind: "rebalance",
  });

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
      sanitizedAllocations,
      reconciliation.nav ?? latestSnapshot.nav,
      "rebalance",
      latestSnapshot.id,
      rebalanceIntel
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
  const [createdFunds, paperPortfolios, pendingRebalances, notifications] =
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
      listPaperPortfolios(userId),
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
        take: 30,
        include: {
          fund: { select: { slug: true, name: true } },
        },
      }),
    ]);

  const recentActions = await prisma.reasoningLog.findMany({
    where: { fund: { userId } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Backward-compatible shape for older UI + rich paper portfolios
  const follows = paperPortfolios.map((p) => ({
    fund: {
      slug: p.fundSlug,
      name: p.fundName,
      status: p.fundStatus,
    },
    allocationPct: p.allocationPct,
    paperNav: p.paperNav,
    pnlPct: p.pnlPct,
    vsLeaderPct: p.vsLeaderPct,
    lastSyncedAt: p.lastSyncedAt,
    lastTriggeredBy: p.lastTriggeredBy,
  }));

  return {
    createdFunds,
    follows,
    paperPortfolios,
    pendingRebalances,
    notifications,
    recentActions,
  };
}



export { inferRiskLevel };


