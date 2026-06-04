"use client";

import { useState } from "react";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { Button } from "@/components/ui/button";

type RebalanceRun = {
  id: string;
  status: string;
  proposedAllocationsJson: string;
  previousAllocationsJson: string;
  createdAt: string;
};

export function RebalancePanel({
  slug,
  initialPending,
}: {
  slug: string;
  initialPending: RebalanceRun[];
}) {
  const { address, isConnected } = useWallet();
  const [pending, setPending] = useState(initialPending);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function propose() {
    if (!address) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithWallet(`/api/funds/${slug}/rebalance`, address, {
        method: "POST",
        body: JSON.stringify({ action: "propose" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPending([data.rebalanceRun, ...pending]);
      setMessage("Rebalance proposed — review allocations below.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function act(
    runId: string,
    action: "approve" | "reject"
  ) {
    if (!address) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithWallet(`/api/funds/${slug}/rebalance`, address, {
        method: "POST",
        body: JSON.stringify({
          action,
          rebalanceRunId: runId,
          disclosureAccepted: action === "approve",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPending(pending.filter((p) => p.id !== runId));
      setMessage(action === "approve" ? "Rebalance executed." : "Rebalance rejected.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <h2 className="font-medium text-sm tracking-wide">Rebalance queue</h2>
          <p className="text-xs text-muted mt-0.5">
            SoSo-powered proposals require your approval
          </p>
        </div>
        {isConnected ? (
          <Button onClick={propose} disabled={loading} size="sm">
            Propose rebalance
          </Button>
        ) : (
          <span className="text-xs text-muted">Connect wallet to manage</span>
        )}
      </div>
      <div className="dashboard-panel-body">
        {message && (
          <p className="text-sm text-muted mb-4 rounded-lg border border-border bg-elevated px-3 py-2">
            {message}
          </p>
        )}
        {pending.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">
            No pending rebalances — propose one when SoSo signals shift.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((run) => {
              const proposed = JSON.parse(
                run.proposedAllocationsJson
              ) as { symbol: string; weight: number }[];
              return (
                <li
                  key={run.id}
                  className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">Pending review</p>
                    <span className="dashboard-badge dashboard-badge-pending">
                      {run.status}
                    </span>
                  </div>
                  <p className="text-muted text-xs mt-1">
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed">
                    {proposed
                      .map((a) => `${a.symbol} ${(a.weight * 100).toFixed(0)}%`)
                      .join(" · ")}
                  </p>
                  {isConnected && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => act(run.id, "approve")}
                        disabled={loading}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => act(run.id, "reject")}
                        disabled={loading}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
