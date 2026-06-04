"use client";

import { useState } from "react";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { IntelligenceWidgets } from "@/components/soso/intelligence-widgets";
import type { MarketIntelligencePacket } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function IntelligencePanel({
  slug,
  initialSnapshot,
}: {
  slug: string;
  initialSnapshot: MarketIntelligencePacket | null;
}) {
  const { address } = useWallet();
  const [mode, setMode] = useState<"snapshot" | "live">("snapshot");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [live, setLive] = useState<MarketIntelligencePacket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshLive() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/funds/${slug}/intelligence?refresh=true&charts=true`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setLive(data.live);
      setMode("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function acceptLive() {
    if (!live || !address) return;
    setLoading(true);
    try {
      const res = await fetchWithWallet(
        `/api/funds/${slug}/intelligence`,
        address,
        {
          method: "POST",
          body: JSON.stringify({ intelPacket: live }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      setSnapshot(live);
      setMode("snapshot");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const display = mode === "live" && live ? live : snapshot;

  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <h2 className="font-medium text-sm tracking-wide">SoSo intelligence</h2>
          <p className="text-xs text-muted mt-0.5">
            {mode === "live" ? "Live packet" : "Saved snapshot"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMode("snapshot")}
            disabled={!snapshot}
          >
            Snapshot
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshLive}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Live refresh"}
          </Button>
          {live && address && (
            <Button size="sm" onClick={acceptLive} disabled={loading}>
              Accept update
            </Button>
          )}
        </div>
      </div>
      <div className="dashboard-panel-body">
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <IntelligenceWidgets intel={display} />
      </div>
    </section>
  );
}
