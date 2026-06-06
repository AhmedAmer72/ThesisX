import { prisma } from "@/lib/db";
import { logExecution } from "@/lib/observability";
import type { Allocation } from "@/lib/types";

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
      JSON.parse(snapshot.allocationsJson) as Allocation[],
      snapshot.nav,
      "follow",
      snapshot.id
    );
  }

  await prisma.reasoningLog.create({
    data: {
      fundId,
      type: "copy",
      title: "Watchlist mirror activated",
      body: `User ${userId} mirrors leader allocations at ${allocationPct}% (watchlist — no auto-execution).`,
      metadataJson: JSON.stringify({ followId: follow.id, mode: "watchlist_mirror" }),
    },
  });

  return { success: true, mode: "watchlist_mirror" as const, followId: follow.id };
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
    },
  });
  if (!follow || follow.status !== "active") {
    return { following: false };
  }
  return {
    following: true,
    allocationPct: follow.allocationPct,
    latestSnapshot: follow.snapshots[0] ?? null,
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
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function fanoutSnapshotToFollower(
  followId: string,
  allocations: Allocation[],
  sourceNav: number,
  triggeredBy: string,
  sourceFundSnapshotId?: string
) {
  const follow = await prisma.fundFollow.findUnique({ where: { id: followId } });
  if (!follow || follow.status !== "active") return;

  const scale = follow.allocationPct / 100;
  const scaled = allocations.map((a) => ({
    ...a,
    weight: a.weight * scale,
  }));
  const followerNav = sourceNav * scale;

  await prisma.followerSnapshot.create({
    data: {
      followId,
      allocationsJson: JSON.stringify(scaled),
      nav: followerNav,
      triggeredBy,
      sourceFundSnapshotId,
    },
  });
}

/** Fan out paper portfolio updates to all active followers after execution/rebalance. */
export async function fanoutToFollowers(
  fundId: string,
  allocations: Allocation[],
  nav: number,
  triggeredBy: "execution" | "rebalance",
  sourceFundSnapshotId?: string
) {
  const follows = await prisma.fundFollow.findMany({
    where: { fundId, status: "active" },
  });

  for (const follow of follows) {
    await fanoutSnapshotToFollower(
      follow.id,
      allocations,
      nav,
      triggeredBy,
      sourceFundSnapshotId
    );
  }

  if (follows.length > 0) {
    logExecution(fundId, "follower_fanout", {
      followerCount: follows.length,
      triggeredBy,
    });
  }

  return { followerCount: follows.length };
}
