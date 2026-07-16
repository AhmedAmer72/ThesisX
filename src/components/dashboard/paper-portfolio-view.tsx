"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { AllocationChart } from "@/components/fund/allocation-chart";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { Button } from "@/components/ui/button";

type PortfolioDetail = {
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
  leaderNav: number | null;
  allocations: { symbol: string; name: string; weight: number; sector?: string }[];
  leaderAllocations: {
    symbol: string;
    name: string;
    weight: number;
    sector?: string;
  }[];
  history: {
    id: string;
    nav: number;
    triggeredBy: string;
    createdAt: string;
  }[];
};

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function triggerLabel(t: string) {
  switch (t) {
    case "follow":
      return "Joined mirror";
    case "execution":
      return "Leader execution";
    case "rebalance":
      return "Leader rebalance";
    default:
      return t.replace(/^mirror_/, "").replace(/_/g, " ");
  }
}

export function PaperPortfolioView({ slug }: { slug: string }) {
  const router = useRouter();
  const { address, isConnected, sessionStatus } = useWallet();
  const [portfolio, setPortfolio] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfollowing, setUnfollowing] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithWallet(
        `/api/copy/portfolios/${encodeURIComponent(slug)}`,
        address
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load paper portfolio");
      setPortfolio(json.portfolio);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setPortfolio(null);
    } finally {
      setLoading(false);
    }
  }, [address, slug]);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    if (sessionStatus === "linking") return;
    void load();
  }, [address, sessionStatus, load]);

  async function stopMirror() {
    if (!address || !portfolio) return;
    setUnfollowing(true);
    try {
      const res = await fetchWithWallet("/api/copy", address, {
        method: "POST",
        body: JSON.stringify({ fundId: portfolio.fundId, action: "unfollow" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Unfollow failed");
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not stop mirroring");
    } finally {
      setUnfollowing(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="site-offset container py-12 max-w-3xl">
        <p className="text-muted text-sm mb-4">
          Connect your wallet to view this paper strategy mirror.
        </p>
        <WalletConnectButton variant="settings" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="site-offset container py-12">
        <DashboardLoading />
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="site-offset container py-12 max-w-xl">
        <p className="text-red-300 text-sm">{error ?? "Portfolio not found"}</p>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
            ← Dashboard
          </Link>
          <Link
            href="/marketplace"
            className="text-sm text-muted hover:text-foreground"
          >
            Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const pnlPositive = portfolio.pnlPct >= 0;

  return (
    <div className="dashboard-page site-offset min-h-[70vh] bg-page-background pb-16">
      <div className="dashboard-inner container py-10 md:py-12 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/dashboard" className="text-muted hover:text-foreground">
            ← My dashboard
          </Link>
          <span className="text-muted">/</span>
          <span className="text-muted">Paper mirror</span>
        </div>

        <header className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
              Paper strategy mirror · no capital at risk
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-normal tracking-tight mt-2">
              {portfolio.fundName}
            </h1>
            <p className="text-sm text-muted mt-2">
              {portfolio.strategyType} · {portfolio.riskLevel} risk ·{" "}
              {portfolio.allocationPct}% mirror scale
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Link href={`/funds/${portfolio.fundSlug}`}>
              <Button variant="secondary" size="sm">
                Leader page
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              disabled={unfollowing}
              onClick={() => void stopMirror()}
            >
              {unfollowing ? "Stopping…" : "Stop mirroring"}
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dashboard-panel p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Paper NAV</p>
            <p className="text-2xl font-semibold mt-1">
              {fmtUsd(portfolio.paperNav)}
            </p>
          </div>
          <div className="dashboard-panel p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Your PnL</p>
            <p
              className={`text-2xl font-semibold mt-1 ${
                pnlPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtPct(portfolio.pnlPct)}
            </p>
            <p className="text-xs text-muted mt-1">
              Entry {fmtUsd(portfolio.entryNav)}
            </p>
          </div>
          <div className="dashboard-panel p-4">
            <p className="text-xs text-muted uppercase tracking-wider">vs Leader</p>
            <p className="text-2xl font-semibold mt-1">
              {fmtPct(portfolio.vsLeaderPct)}
            </p>
            <p className="text-xs text-muted mt-1">
              Leader {fmtPct(portfolio.leaderPnlPct)}
            </p>
          </div>
          <div className="dashboard-panel p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Last sync</p>
            <p className="text-sm font-medium mt-2">
              {portfolio.lastSyncedAt
                ? new Date(portfolio.lastSyncedAt).toLocaleString()
                : "—"}
            </p>
            <p className="text-xs text-muted mt-1 capitalize">
              {portfolio.lastTriggeredBy
                ? triggerLabel(portfolio.lastTriggeredBy)
                : "Awaiting leader activity"}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="dashboard-panel p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
              Your mirrored allocations
            </h2>
            {portfolio.allocations.length > 0 ? (
              <AllocationChart
                allocations={portfolio.allocations}
                showTitle={false}
              />
            ) : (
              <p className="text-sm text-muted">No allocations yet.</p>
            )}
          </div>
          <div className="dashboard-panel p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
              Leader book (reference)
            </h2>
            {portfolio.leaderAllocations.length > 0 ? (
              <AllocationChart
                allocations={portfolio.leaderAllocations}
                showTitle={false}
              />
            ) : (
              <p className="text-sm text-muted">Leader snapshot unavailable.</p>
            )}
            {portfolio.leaderNav != null && (
              <p className="text-xs text-muted mt-4">
                Leader NAV {fmtUsd(portfolio.leaderNav)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 dashboard-panel p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
            Mirror timeline
          </h2>
          {portfolio.history.length === 0 ? (
            <p className="text-sm text-muted">No sync events yet.</p>
          ) : (
            <ul className="space-y-3">
              {portfolio.history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {triggerLabel(h.triggeredBy)}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{fmtUsd(h.nav)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {portfolio.history.length >= 2 && (
          <div className="mt-8 dashboard-panel p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
              Paper NAV path
            </h2>
            <div className="flex items-end gap-1 h-28">
              {[...portfolio.history].reverse().map((h) => {
                const max = Math.max(...portfolio.history.map((x) => x.nav), 1);
                const height = Math.max(8, (h.nav / max) * 100);
                return (
                  <div
                    key={h.id}
                    className="flex-1 min-w-[6px] rounded-t bg-primary/70"
                    style={{ height: `${height}%` }}
                    title={`${fmtUsd(h.nav)} · ${triggerLabel(h.triggeredBy)}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
