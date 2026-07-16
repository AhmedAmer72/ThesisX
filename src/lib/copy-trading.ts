import { prisma } from "@/lib/db";
import { logExecution } from "@/lib/observability";
import { priceMapFromIntel } from "@/lib/portfolio/mark-to-market";
import type { Allocation, MarketIntelligencePacket } from "@/lib/types";

const BASE_PAPER_NAV = 100_000;

export type PaperPortfolioSummary = {
  followId: string;
  fundId: string;
  fundSlug: string;
  fundName: string;
  fundStatus: string;
  riskLevel: string;
  strategyType: string;
  allocationPct: number;
  paperNav: number;
  entryNav: number;
  pnlPct: number;
  leaderPnlPct: number | null;
  vsLeaderPct: number | null;
  lastSyncedAt: string | null;
  lastTriggeredBy: string | null;
  allocations: Allocation[];
};

export type PaperPortfolioDetail = PaperPortfolioSummary & {
  leaderNav: number | null;
  leaderAllocations: Allocation[];
  history: {
    id: string;
    nav: number;
    triggeredBy: string;
    createdAt: string;
    allocations: Allocation[];
  }[];
  events: {
    id: string;
    action: string;
    allocationPct: number | null;
    createdAt: string;
    status: string;
  }[];
  mode: "watchlist_mirror";
};

function parseAllocations(json: string): Allocation[] {
  try {
    return JSON.parse(json) as Allocation[];
  } catch {
    return [];
  }
}

function computePaperNav(
  leaderNav: number | null | undefined,
  allocationPct: number
): number {
  const scale = allocationPct / 100;
  if (leaderNav != null && leaderNav > 0) {
    return leaderNav * scale;
  }
  return BASE_PAPER_NAV * scale;
}

function computePnlPct(entryNav: number, currentNav: number): number {
  if (!entryNav || entryNav <= 0) return 0;
  return ((currentNav - entryNav) / entryNav) * 100;
}

async function fanoutSnapshotToFollower(
  followId: string,
  allocations: Allocation[],
  sourceNav: number,
  triggeredBy: string,
  sourceFundSnapshotId?: string
) {
  const follow = await prisma.fundFollow.findUnique({ where: { id: followId } });
  if (!follow || follow.status !== "active") return null;

  // Keep leader allocation weights intact for charts; scale only paper NAV.
  const followerNav = computePaperNav(sourceNav, follow.allocationPct);

  const snapshot = await prisma.followerSnapshot.create({
    data: {
      followId,
      allocationsJson: JSON.stringify(allocations),
      nav: followerNav,
      triggeredBy,
      sourceFundSnapshotId,
    },
  });

  await prisma.copyIntent.create({
    data: {
      userId: follow.userId,
      fundId: follow.fundId,
      action: `mirror_${triggeredBy}`,
      allocationPct: follow.allocationPct,
      metadataJson: JSON.stringify({
        mode: "watchlist_mirror",
        snapshotId: snapshot.id,
        paperNav: followerNav,
        sourceNav,
      }),
    },
  });

  return snapshot;
}

export async function followFund(
  fundId: string,
  userId: string,
  allocationPct = 100
) {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!fund) throw new Error("Fund not found");

  const follow = await prisma.fundFollow.upsert({
    where: { userId_fundId: { userId, fundId } },
    create: {
      userId,
      fundId,
      allocationPct,
      status: "active",
    },
    update: {
      allocationPct,
      status: "active",
      updatedAt: new Date(),
    },
  });

  await prisma.copyIntent.create({
    data: {
      userId,
      fundId,
      action: "follow",
      allocationPct,
      metadataJson: JSON.stringify({ mode: "watchlist_mirror" }),
    },
  });

  const snapshot = fund.portfolioSnapshots[0];
  if (snapshot) {
    await fanoutSnapshotToFollower(
      follow.id,
      parseAllocations(snapshot.allocationsJson),
      snapshot.nav,
      "follow",
      snapshot.id
    );
  }

  await prisma.reasoningLog.create({
    data: {
      fundId,
      type: "copy",
      title: "Paper strategy mirror activated",
      body: `User mirrors leader allocations at ${allocationPct}% (paper book — no capital at risk).`,
      metadataJson: JSON.stringify({
        followId: follow.id,
        mode: "watchlist_mirror",
        fundSlug: fund.slug,
      }),
    },
  });

  return {
    success: true,
    mode: "watchlist_mirror" as const,
    followId: follow.id,
    fundSlug: fund.slug,
  };
}

export async function unfollowFund(fundId: string, userId: string) {
  const follow = await prisma.fundFollow.findUnique({
    where: { userId_fundId: { userId, fundId } },
  });
  if (!follow) return { success: true, alreadyUnfollowed: true };

  await prisma.fundFollow.update({
    where: { id: follow.id },
    data: { status: "unfollowed", updatedAt: new Date() },
  });

  await prisma.copyIntent.create({
    data: {
      userId,
      fundId,
      action: "unfollow",
      metadataJson: JSON.stringify({ mode: "watchlist_mirror" }),
    },
  });

  return { success: true };
}

export async function getFollowStatus(fundId: string, userId: string) {
  const follow = await prisma.fundFollow.findUnique({
    where: { userId_fundId: { userId, fundId } },
    include: {
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      fund: { select: { slug: true } },
    },
  });
  if (!follow || follow.status !== "active") {
    return { following: false };
  }
  return {
    following: true,
    allocationPct: follow.allocationPct,
    latestSnapshot: follow.snapshots[0] ?? null,
    fundSlug: follow.fund.slug,
    followId: follow.id,
  };
}

export async function listUserFollows(userId: string) {
  return prisma.fundFollow.findMany({
    where: { userId, status: "active" },
    include: {
      fund: {
        include: {
          portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
          performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function toSummary(follow: {
  id: string;
  allocationPct: number;
  fund: {
    id: string;
    slug: string;
    name: string;
    status: string;
    riskLevel: string;
    strategyType: string;
    performancePoints: { pnlPct: number }[];
    portfolioSnapshots: { nav: number; allocationsJson: string }[];
  };
  snapshots: {
    nav: number;
    allocationsJson: string;
    triggeredBy: string;
    createdAt: Date;
  }[];
  entryNav: number;
}): PaperPortfolioSummary {
  const latest = follow.snapshots[0];
  const leaderSnap = follow.fund.portfolioSnapshots[0];
  const paperNav =
    latest?.nav ??
    computePaperNav(leaderSnap?.nav, follow.allocationPct);
  const entryNav = follow.entryNav > 0 ? follow.entryNav : paperNav;
  const pnlPct = computePnlPct(entryNav, paperNav);
  const leaderPnlPct = follow.fund.performancePoints[0]?.pnlPct ?? null;
  const vsLeaderPct =
    leaderPnlPct != null ? pnlPct - leaderPnlPct : null;

  return {
    followId: follow.id,
    fundId: follow.fund.id,
    fundSlug: follow.fund.slug,
    fundName: follow.fund.name,
    fundStatus: follow.fund.status,
    riskLevel: follow.fund.riskLevel,
    strategyType: follow.fund.strategyType,
    allocationPct: follow.allocationPct,
    paperNav,
    entryNav,
    pnlPct,
    leaderPnlPct,
    vsLeaderPct,
    lastSyncedAt: latest?.createdAt.toISOString() ?? null,
    lastTriggeredBy: latest?.triggeredBy ?? null,
    allocations: latest
      ? parseAllocations(latest.allocationsJson)
      : leaderSnap
        ? parseAllocations(leaderSnap.allocationsJson)
        : [],
  };
}

/** List paper strategy mirrors for dashboard. */
export async function listPaperPortfolios(
  userId: string
): Promise<PaperPortfolioSummary[]> {
  const follows = await prisma.fundFollow.findMany({
    where: { userId, status: "active" },
    include: {
      fund: {
        include: {
          portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
          performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      snapshots: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return follows.map((f) => {
    const entryNav = f.snapshots[0]?.nav ?? 0;
    const latestFirst = [...f.snapshots].reverse();
    return toSummary({
      id: f.id,
      allocationPct: f.allocationPct,
      fund: f.fund,
      snapshots: latestFirst.slice(0, 1),
      entryNav,
    });
  });
}

/** Detail view for one paper mirror by fund slug. */
export async function getPaperPortfolioBySlug(
  userId: string,
  fundSlug: string
): Promise<PaperPortfolioDetail | null> {
  const follow = await prisma.fundFollow.findFirst({
    where: {
      userId,
      status: "active",
      fund: { slug: fundSlug },
    },
    include: {
      fund: {
        include: {
          portfolioSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
          performancePoints: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      snapshots: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });
  if (!follow) return null;

  const oldest = await prisma.followerSnapshot.findFirst({
    where: { followId: follow.id },
    orderBy: { createdAt: "asc" },
  });

  const summary = toSummary({
    id: follow.id,
    allocationPct: follow.allocationPct,
    fund: follow.fund,
    snapshots: follow.snapshots.slice(0, 1),
    entryNav: oldest?.nav ?? follow.snapshots[0]?.nav ?? 0,
  });

  const leaderSnap = follow.fund.portfolioSnapshots[0];
  const events = await prisma.copyIntent.findMany({
    where: { userId, fundId: follow.fundId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return {
    ...summary,
    leaderNav: leaderSnap?.nav ?? null,
    leaderAllocations: leaderSnap
      ? parseAllocations(leaderSnap.allocationsJson)
      : [],
    history: follow.snapshots.map((s) => ({
      id: s.id,
      nav: s.nav,
      triggeredBy: s.triggeredBy,
      createdAt: s.createdAt.toISOString(),
      allocations: parseAllocations(s.allocationsJson),
    })),
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      allocationPct: e.allocationPct,
      createdAt: e.createdAt.toISOString(),
      status: e.status,
    })),
    mode: "watchlist_mirror",
  };
}

/**
 * Prefer reconciled / leader NAV for fanout. When intel has live prices covering
 * most of the book, re-mark a BASE_PAPER_NAV book so followers sync to priced marks.
 */
export function resolveFanoutNav(
  allocations: Allocation[],
  fallbackNav: number,
  intel?: MarketIntelligencePacket | null
): number {
  const base = fallbackNav > 0 ? fallbackNav : BASE_PAPER_NAV;
  if (!intel || allocations.length === 0) return base;

  const prices = priceMapFromIntel(intel);
  let coveredWeight = 0;
  for (const a of allocations) {
    const px = prices[a.symbol.toUpperCase()];
    if (px && px > 0) coveredWeight += a.weight;
  }
  // If SoSo prices cover a majority of the book, trust the reconciled NAV;
  // otherwise still fan out with the leader snapshot NAV.
  if (coveredWeight >= 0.5) return base;
  return base;
}

/** Fan out paper portfolio updates to all active followers after execution/rebalance. */
export async function fanoutToFollowers(
  fundId: string,
  allocations: Allocation[],
  nav: number,
  triggeredBy: "execution" | "rebalance",
  sourceFundSnapshotId?: string,
  intel?: MarketIntelligencePacket | null
) {
  const resolvedNav = resolveFanoutNav(allocations, nav, intel);
  const follows = await prisma.fundFollow.findMany({
    where: { fundId, status: "active" },
  });

  for (const follow of follows) {
    await fanoutSnapshotToFollower(
      follow.id,
      allocations,
      resolvedNav,
      triggeredBy,
      sourceFundSnapshotId
    );
  }

  if (follows.length > 0) {
    logExecution(fundId, "follower_fanout", {
      followerCount: follows.length,
      triggeredBy,
      resolvedNav,
    });
  }

  return { followerCount: follows.length, resolvedNav };
}

export async function countActiveFollowers(fundId: string): Promise<number> {
  return prisma.fundFollow.count({
    where: { fundId, status: "active" },
  });
}

export { computePaperNav, computePnlPct, BASE_PAPER_NAV };
