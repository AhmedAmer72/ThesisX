"use client";

import { useEffect, useState } from "react";
import type { MarketIntelligencePacket } from "@/lib/types";

type Pulse = NonNullable<MarketIntelligencePacket["marketPulse"]>;

export function MarketPulse() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [moduleCount, setModuleCount] = useState(0);
  const [topMovers, setTopMovers] = useState<
    { symbol: string; change24h: number }[]
  >([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "poll">(
    "connecting"
  );

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;

    async function bootstrap() {
      try {
        const r = await fetch("/api/intelligence?live=true");
        const data = await r.json();
        if (!r.ok) {
          if (!cancelled) {
            setError(data.error ?? "Live SoSoValue unavailable");
            setLoading(false);
          }
          return;
        }
        if (cancelled) return;
        const packet = data.packet as MarketIntelligencePacket;
        setPulse(packet.marketPulse ?? null);
        setModuleCount(packet.sources?.length ?? 0);
        setTopMovers(packet.topMovers?.slice(0, 4) ?? []);
        setFetchedAt(packet.fetchedAt);
        setLive(!packet.demoMode);
        setLoading(false);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Failed to load market pulse");
          setLoading(false);
        }
      }
    }

    void bootstrap();

    try {
      es = new EventSource("/api/stream?channel=market-pulse");
      es.onopen = () => {
        if (!cancelled) setStreamStatus("live");
      };
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as {
            type: string;
            payload?: Pulse;
            fetchedAt?: string;
            demoMode?: boolean;
          };
          if (msg.type === "market_pulse" && msg.payload) {
            setPulse(msg.payload);
            if (msg.fetchedAt) setFetchedAt(msg.fetchedAt);
            if (typeof msg.demoMode === "boolean") setLive(!msg.demoMode);
            setLoading(false);
            setError(null);
            setStreamStatus("live");
          }
          if (msg.type === "intel_refresh" && msg.payload) {
            const p = msg.payload as { riskOnScore?: number };
            setPulse((prev) =>
              prev
                ? { ...prev, riskOnScore: p.riskOnScore ?? prev.riskOnScore }
                : prev
            );
          }
        } catch {
          /* ignore bad frames */
        }
      };
      es.onerror = () => {
        if (!cancelled) setStreamStatus("poll");
      };
    } catch {
      setStreamStatus("poll");
    }

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 animate-pulse h-32" />
    );
  }

  if (error || !pulse) {
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

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">
            Live SoSoValue Market Pulse
          </p>
          <p className="text-2xl font-semibold mt-1">
            Risk-on {pulse.riskOnScore ?? 0}
            <span className="text-base text-muted font-normal"> / 100</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-400">
            {moduleCount > 0 ? `${moduleCount} modules` : live ? "Live" : "Stream"}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              streamStatus === "live"
                ? "border-emerald-800/50 text-emerald-400"
                : "border-border text-muted"
            }`}
          >
            {streamStatus === "live"
              ? "SSE live"
              : streamStatus === "connecting"
                ? "Connecting…"
                : "Polling fallback"}
          </span>
        </div>
      </div>
      <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted text-xs">ETF inflows</p>
          <p className="font-medium mt-1">{pulse.etfInflowCount ?? 0} trackers</p>
        </div>
        <div>
          <p className="text-muted text-xs">Bullish headlines</p>
          <p className="font-medium mt-1">{pulse.bullishHeadlines ?? 0}</p>
        </div>
        <div>
          <p className="text-muted text-xs">SSI indexes up</p>
          <p className="font-medium mt-1">{pulse.indexesPositive ?? 0}</p>
        </div>
      </div>
      {pulse.topHeadline && (
        <p className="text-sm text-muted mt-4 line-clamp-2">
          <span className="text-foreground">Top story:</span> {pulse.topHeadline}
        </p>
      )}
      {topMovers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {topMovers.map((m) => (
            <span
              key={m.symbol}
              className="text-xs rounded-full border border-border bg-elevated px-2 py-0.5"
            >
              {m.symbol}{" "}
              <span
                className={
                  m.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                }
              >
                {m.change24h >= 0 ? "+" : ""}
                {m.change24h.toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      )}
      {fetchedAt && (
        <p className="text-[10px] text-muted mt-4">
          Updated {new Date(fetchedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
