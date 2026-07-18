"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/providers/wallet-provider";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { fetchWithWallet } from "@/lib/wallet/api";
import { shortenAddress } from "@/lib/wallet/utils";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { cn } from "@/lib/utils";

type FundRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  riskLevel?: string;
  rebalanceRuns: { id: string; status: string }[];
  tradeIntents: { status: string }[];
  portfolioSnapshots?: { nav: number; confidence: number }[];
  performancePoints?: { nav: number; pnlPct: number }[];
};

type DashboardData = {
  plan?: string;
  createdFunds: FundRow[];
  follows: {
    fund: { slug: string; name: string; status: string };
    allocationPct: number;
  }[];
  pendingRebalances: {
    id: string;
    fund: { slug: string; name: string };
    createdAt: string;
  }[];
  notifications: {
    id: string;
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
    type?: string;
  }[];
  recentActions: {
    title: string;
    type: string;
    createdAt: string;
    fundId: string;
  }[];
};

function statusBadge(status: string) {
  if (status === "active") return "dashboard-badge dashboard-badge-live";
  if (status === "pending_review") return "dashboard-badge dashboard-badge-pending";
  return "dashboard-badge dashboard-badge-muted";
}

function actionIcon(type: string) {
  switch (type) {
    case "execution":
      return "⚡";
    case "rebalance":
      return "↻";
    case "committee":
      return "◎";
    case "thesis":
      return "◈";
    default:
      return "·";
  }
}

export function DashboardIndexView() {
  const { address, isConnected, isBackendLinked, sessionStatus } = useWallet();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithWallet("/api/me/funds", address);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Wait until the backend session is established before loading protected data.
  // In dev (sessionStatus stays "idle"), load as soon as address is available.
  // In strict/buildathon mode, load once isBackendLinked becomes true.
  useEffect(() => {
    if (!address) return;
    if (sessionStatus === "linking") return;
    void load();
  }, [address, isBackendLinked, sessionStatus, load]);

  const stats = useMemo(() => {
    if (!data) return null;
    const pendingApprovals = data.createdFunds.filter(
      (f) => f.tradeIntents.length > 0
    ).length;
    const unreadAlerts = data.notifications.filter((n) => !n.read).length;
    return {
      funds: data.createdFunds.length,
      follows: data.follows.length,
      pending: data.pendingRebalances.length + pendingApprovals,
      alerts: unreadAlerts,
    };
  }, [data]);

  async function markRead(id: string) {
    if (!address) return;
    await fetchWithWallet("/api/notifications", address, {
      method: "PATCH",
      body: JSON.stringify({ id }),
    });
    setData((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
          }
        : prev
    );
  }

  return (
    <div className="dashboard-page site-offset min-h-[70vh] bg-page-background pb-16">
      <div className="dashboard-inner container py-10 md:py-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
              Portfolio command center
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-normal tracking-tight mt-2">
              My dashboard
            </h1>
            <p className="text-sm text-muted mt-3 max-w-xl">
              Funds you manage, paper follows, rebalance approvals, and SoSo-driven
              alerts — all tied to your connected wallet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isConnected && address && (
              <div className="dashboard-panel px-4 py-2.5 text-xs">
                <span className="text-muted">Wallet </span>
                <span className="font-medium">{shortenAddress(address, 5)}</span>
                {data?.plan && (
                  <span className="dashboard-badge dashboard-badge-muted ml-2">
                    {data.plan}
                  </span>
                )}
              </div>
            )}
            {isConnected && (
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="dashboard-quick-action disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            )}
            {!isConnected && <WalletConnectButton variant="settings" />}
          </div>
        </header>

        <div className="mt-8">
          <OnboardingChecklist />
        </div>

        {!isConnected && (
          <div className="dashboard-panel mt-10 max-w-lg">
            <div className="dashboard-panel-body">
              <DashboardEmptyState
                title="Connect your wallet"
                description="Link your wallet to see funds you created, paper follows, and pending AI actions."
                primaryLabel="Connect wallet"
              />
              <div className="flex justify-center pb-2">
                <WalletConnectButton variant="settings" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {error}
            <button
              type="button"
              onClick={() => void load()}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        )}

        {isConnected && sessionStatus === "linking" && (
          <div className="mt-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            Signing in with your wallet — check your wallet for a sign request…
          </div>
        )}

        {isConnected && sessionStatus !== "linking" && loading && !data && <DashboardLoading />}

        {isConnected && data && stats && (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/create" className="dashboard-quick-action">
                + Create fund
              </Link>
              <Link href="/marketplace" className="dashboard-quick-action">
                Browse marketplace
              </Link>
              <Link href="/settings" className="dashboard-quick-action">
                Settings & SoSo health
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "My funds", value: stats.funds },
                { label: "Following", value: stats.follows },
                { label: "Needs action", value: stats.pending },
                { label: "Unread alerts", value: stats.alerts },
              ].map((s) => (
                <div key={s.label} className="dashboard-stat">
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    {s.label}
                  </p>
                  <p className="dashboard-stat-value mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid lg:grid-cols-2 gap-5">
              <DashboardPanel
                title="My funds"
                count={data.createdFunds.length}
                action={
                  <Link
                    href="/create"
                    className="text-xs text-muted hover:text-foreground"
                  >
                    New fund →
                  </Link>
                }
              >
                {data.createdFunds.length === 0 ? (
                  <DashboardEmptyState
                    title="No funds yet"
                    description="Create an AI-managed fund with SoSo intelligence and committee approval."
                    primaryHref="/create"
                    primaryLabel="Create your first fund"
                    secondaryHref="/marketplace"
                    secondaryLabel="Explore marketplace"
                  />
                ) : (
                  <ul className="space-y-1 -mx-1">
                    {data.createdFunds.map((f) => {
                      const perf = f.performancePoints?.[0];
                      const snap = f.portfolioSnapshots?.[0];
                      const needsApproval = f.tradeIntents.length > 0;
                      const needsRebalance = f.rebalanceRuns.length > 0;
                      return (
                        <li key={f.id}>
                          <Link href={`/dashboard/${f.slug}`} className="dashboard-row block">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{f.name}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={statusBadge(f.status)}>
                                  {f.status.replace("_", " ")}
                                </span>
                                {needsApproval && (
                                  <span className="dashboard-badge dashboard-badge-pending">
                                    Approval
                                  </span>
                                )}
                                {needsRebalance && (
                                  <span className="dashboard-badge dashboard-badge-pending">
                                    Rebalance
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 text-xs">
                              <p className="font-medium">
                                ${(perf?.nav ?? snap?.nav ?? 100000).toLocaleString()}
                              </p>
                              {perf && (
                                <p
                                  className={cn(
                                    "mt-0.5",
                                    perf.pnlPct >= 0 ? "text-emerald-400" : "text-red-400"
                                  )}
                                >
                                  {perf.pnlPct >= 0 ? "+" : ""}
                                  {perf.pnlPct.toFixed(2)}%
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Following (paper)"
                count={data.follows.length}
                action={
                  <Link
                    href="/marketplace"
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Marketplace →
                  </Link>
                }
              >
                {data.follows.length === 0 ? (
                  <DashboardEmptyState
                    title="No follows yet"
                    description="Mirror public fund allocations in a paper portfolio — no capital at risk."
                    primaryHref="/marketplace"
                    primaryLabel="Find funds to follow"
                  />
                ) : (
                  <ul className="space-y-1 -mx-1">
                    {data.follows.map((fo, i) => (
                      <li key={i}>
                        <Link
                          href={`/funds/${fo.fund.slug}`}
                          className="dashboard-row block"
                        >
                          <div>
                            <p className="font-medium">{fo.fund.name}</p>
                            <span className={statusBadge(fo.fund.status)}>
                              {fo.fund.status}
                            </span>
                          </div>
                          <span className="text-xs text-muted shrink-0">
                            {fo.allocationPct}% mirror
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Pending rebalances"
                count={data.pendingRebalances.length}
              >
                {data.pendingRebalances.length === 0 ? (
                  <DashboardEmptyState
                    title="All clear"
                    description="When SoSo signals shift, rebalance proposals appear here for your approval."
                  />
                ) : (
                  <ul className="space-y-1 -mx-1">
                    {data.pendingRebalances.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/dashboard/${r.fund.slug}`}
                          className="dashboard-row block"
                        >
                          <div>
                            <p className="font-medium">{r.fund.name}</p>
                            <p className="text-xs text-muted mt-1">
                              Review proposed allocation
                            </p>
                          </div>
                          <span className="text-xs text-muted shrink-0">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Alerts"
                count={stats.alerts}
              >
                {data.notifications.length === 0 ? (
                  <DashboardEmptyState
                    title="No alerts yet"
                    description="ETF flows, macro events, index moves, and rebalance notices land here."
                  />
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {data.notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => void markRead(n.id)}
                          className={cn(
                            "w-full text-left rounded-xl border p-3 transition-colors",
                            n.read
                              ? "border-border/60 opacity-70"
                              : "border-amber-900/40 bg-amber-950/10 hover:bg-amber-950/20"
                          )}
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted mt-1 line-clamp-2">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-muted mt-2">
                            {new Date(n.createdAt).toLocaleString()}
                            {!n.read && " · tap to mark read"}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Recent AI actions"
                count={data.recentActions.length}
                className="lg:col-span-2"
              >
                {data.recentActions.length === 0 ? (
                  <DashboardEmptyState
                    title="No activity yet"
                    description="Committee runs, executions, and rebalance events from your funds show up here."
                    primaryHref="/create"
                    primaryLabel="Create a fund"
                  />
                ) : (
                  <ul className="space-y-1 -mx-1">
                    {data.recentActions.map((a, i) => (
                      <li
                        key={i}
                        className="dashboard-row"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-elevated text-sm"
                            aria-hidden
                          >
                            {actionIcon(a.type)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{a.title}</p>
                            <p className="text-xs text-muted mt-0.5 capitalize">
                              {a.type} · {new Date(a.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
