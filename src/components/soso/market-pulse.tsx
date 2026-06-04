"use client";

import { useEffect, useState } from "react";
import type { MarketIntelligencePacket } from "@/lib/types";

export function MarketPulse() {
  const [packet, setPacket] = useState<MarketIntelligencePacket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/intelligence?live=true")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Live SoSoValue unavailable");
          return;
        }
        setPacket(data.packet);
      })
      .catch(() => setError("Failed to load market pulse"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 animate-pulse h-32" />
    );
  }

  if (error || !packet) {
    return (
      <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-6">
        <p className="text-xs uppercase tracking-widest text-amber-400/80">
          SoSoValue Market Pulse
        </p>
        <p className="text-sm text-muted mt-2">{error}</p>
        <p className="text-xs text-muted mt-2">
          Add <code className="bg-elevated px-1 rounded">SOSOVALUE_API_KEY</code> to
          .env to enable live intelligence.
        </p>
      </div>
    );
  }

  const pulse = packet.marketPulse;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">
            Live SoSoValue Market Pulse
          </p>
          <p className="text-2xl font-semibold mt-1">
            Risk-on {pulse?.riskOnScore ?? 0}
            <span className="text-base text-muted font-normal"> / 100</span>
          </p>
        </div>
        <span className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-400">
          {packet.sources.length} modules live
        </span>
      </div>
      <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted text-xs">ETF inflows</p>
          <p className="font-medium mt-1">{pulse?.etfInflowCount ?? 0} trackers</p>
        </div>
        <div>
          <p className="text-muted text-xs">Bullish headlines</p>
          <p className="font-medium mt-1">{pulse?.bullishHeadlines ?? 0}</p>
        </div>
        <div>
          <p className="text-muted text-xs">SSI indexes up</p>
          <p className="font-medium mt-1">{pulse?.indexesPositive ?? 0}</p>
        </div>
      </div>
      {pulse?.topHeadline && (
        <p className="text-sm text-muted mt-4 line-clamp-2">
          <span className="text-foreground">Top story:</span> {pulse.topHeadline}
        </p>
      )}
      {packet.topMovers && packet.topMovers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {packet.topMovers.slice(0, 4).map((m) => (
            <span
              key={m.symbol}
              className="text-xs rounded-full border border-border bg-elevated px-2 py-0.5"
            >
              {m.symbol}{" "}
              <span className={m.change24h >= 0 ? "text-emerald-400" : "text-red-400"}>
                {m.change24h >= 0 ? "+" : ""}
                {m.change24h.toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
