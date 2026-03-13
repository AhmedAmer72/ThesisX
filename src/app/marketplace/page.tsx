export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";
import {
  MarketplaceBrowser,
  type MarketplaceFund,
} from "@/components/marketplace/marketplace-browser";

function computeWeeklyReturn(
  points: { nav: number; pnlPct: number; createdAt: Date }[]
): number | undefined {
  if (points.length < 2) return points[0]?.pnlPct;
  const latest = points[0];
  const weekAgo = points.find(
    (p) =>
      latest.createdAt.getTime() - p.createdAt.getTime() >=
      6 * 24 * 60 * 60 * 1000
  );
  if (!weekAgo) return latest.pnlPct;
  return ((latest.nav - weekAgo.nav) / weekAgo.nav) * 100;
}

export default async function MarketplacePage() {
  const funds = await prisma.fund.findMany({
    where: {
      isPublic: true,
      ...(process.env.SHOW_SEEDED_FUNDS === "true" ? {} : { isSeeded: false }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      thesis: true,
      performancePoints: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  const items: MarketplaceFund[] = funds.map((f) => {
    let sources: { module?: string }[] = [];
    try {
      sources = JSON.parse(f.thesis?.sourcesJson ?? "[]") as {
        module?: string;
      }[];
    } catch {
      sources = [];
    }
    let narratives: string[] = [];
    let sosoModules = sources.map((s) => s.module).filter(Boolean) as string[];
    if (f.thesis?.intelPacketJson) {
      try {
        const pkt = JSON.parse(f.thesis.intelPacketJson) as {
          demoMode?: boolean;
          narratives?: string[];
          sources?: { module: string }[];
        };
        narratives = pkt.narratives ?? [];
        if (pkt.sources?.length) {
          sosoModules = pkt.sources.map((s) => s.module);
        }
        const dataFreshness: "live" | "demo" = pkt.demoMode ? "demo" : "live";
        const weeklyReturn = computeWeeklyReturn(f.performancePoints);
        const drawdownPct = f.performancePoints[0]?.drawdownPct;
        return {
          slug: f.slug,
          name: f.name,
          strategyType: f.strategyType,
          riskLevel: f.riskLevel,
          weeklyReturn,
          confidence: f.thesis?.confidence,
          thesisSnippet: f.thesis?.summary,
          createdAt: f.createdAt.toISOString(),
          status: f.status,
          drawdownPct,
          dataFreshness,
          narratives,
          sosoModules,
        };
      } catch {
        /* fall through */
      }
    }
    const demoSource = sources.some((s) =>
      String(s.module ?? "").toLowerCase().includes("demo")
    );
    const dataFreshness: "live" | "demo" =
      process.env.DEMO_MODE === "true" || demoSource ? "demo" : "live";

    const weeklyReturn = computeWeeklyReturn(f.performancePoints);
    const drawdownPct = f.performancePoints[0]?.drawdownPct;

    return {
      slug: f.slug,
      name: f.name,
      strategyType: f.strategyType,
      riskLevel: f.riskLevel,
      weeklyReturn,
      confidence: f.thesis?.confidence,
      thesisSnippet: f.thesis?.summary,
      createdAt: f.createdAt.toISOString(),
      status: f.status,
      drawdownPct,
      dataFreshness,
      narratives,
      sosoModules,
    };
  });

  return (
    <div className="site-offset container py-10 md:py-14 min-h-[60vh] bg-page-background">
      <p className="text-xs uppercase tracking-widest text-muted">ThesisX</p>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
        AI Fund Marketplace
      </h1>
      <p className="text-muted mt-2 max-w-xl text-[15px]">
        Explore, compare, and follow autonomous AI-managed funds. Filter by
        risk, strategy, returns, and data freshness.
      </p>

      {items.length === 0 ? (
        <div className="mt-12 p-8 rounded-2xl border border-dashed border-border text-center text-muted text-sm">
          No public funds yet.{" "}
          <a href="/create" className="underline text-foreground">
            Create the first fund
          </a>
        </div>
      ) : (
        <MarketplaceBrowser funds={items} />
      )}
    </div>
  );
}
