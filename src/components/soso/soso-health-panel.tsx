"use client";

import { useEffect, useState } from "react";
import type { IntelligenceModuleHealth } from "@/lib/types";

type HealthResponse = {
  configured: boolean;
  modules: IntelligenceModuleHealth[];
  cacheEntries: { module: string; key: string; fetchedAt: string; ageMs: number }[];
};

export function SosoHealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  function loadHealth(live = false) {
    const q = live ? "?live=true" : "";
    void fetch(`/api/intelligence/health${q}`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }

  useEffect(() => {
    loadHealth();
  }, []);

  async function refreshLive() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/intelligence?live=true&refresh=true");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setRefreshMsg(
        `Live packet OK — ${data.packet?.sources?.length ?? 0} modules, risk-on ${data.packet?.marketPulse?.riskOnScore ?? 0}`
      );
      loadHealth(true);
    } catch (e) {
      setRefreshMsg(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  if (!health) return <p className="text-sm text-muted">Loading SoSo modules...</p>;

  return (
    <section className="bg-surface rounded-2xl border border-border p-6">
      <h2 className="font-semibold">SoSoValue modules</h2>
      <p className="text-sm text-muted mt-2">
        API key: {health.configured ? "configured" : "missing — live features disabled"}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {health.modules.map((m) => (
          <li
            key={m.module}
            className="flex justify-between gap-2 py-1 border-b border-border/50"
          >
            <span>{m.label}</span>
            <span
              className={
                m.status === "error" ? "text-red-400 text-xs" : "text-muted text-xs"
              }
            >
              {m.status === "error" ? m.error : m.cacheHit ? "cached" : "ok"}
            </span>
          </li>
        ))}
      </ul>
      {health.cacheEntries.length > 0 && (
        <p className="text-xs text-muted mt-4">
          Cache: {health.cacheEntries.length} entries (newest{" "}
          {Math.round(health.cacheEntries[0].ageMs / 1000)}s ago)
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => loadHealth(true)}
          disabled={!health.configured}
          className="text-sm underline text-foreground disabled:opacity-50"
        >
          Probe live endpoints
        </button>
        <button
          type="button"
          onClick={() => void refreshLive()}
          disabled={refreshing || !health.configured}
          className="text-sm underline text-foreground disabled:opacity-50"
        >
          {refreshing ? "Fetching live SoSo data…" : "Refresh live intelligence"}
        </button>
      </div>
      {refreshMsg && <p className="text-xs text-muted mt-2">{refreshMsg}</p>}
    </section>
  );
}
