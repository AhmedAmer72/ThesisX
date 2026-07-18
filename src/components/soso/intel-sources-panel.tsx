"use client";

import type {
  IntelligenceModuleHealth,
  IntelligenceSource,
  MarketIntelligencePacket,
} from "@/lib/types";

function moduleItemCount(
  module: string,
  intel?: MarketIntelligencePacket | null
): number | null {
  if (!intel) return null;
  switch (module) {
    case "currency":
      return intel.currencies.length;
    case "etf":
      return intel.etf.length;
    case "macro":
      return intel.macro.length;
    case "crypto-stocks":
      return intel.cryptoStocks.length;
    case "feeds":
      return intel.feeds.length;
    case "index":
      return intel.indexes.length;
    case "fundraising":
      return intel.fundraising.length;
    case "btc-treasuries":
      return intel.btcTreasuries.length;
    case "charts":
      return intel.charts?.length ?? 0;
    default:
      return null;
  }
}

export function IntelSourcesPanel({
  sources,
  moduleHealth,
  intelFetchedAt,
  demoMode,
  intel,
}: {
  sources?: IntelligenceSource[];
  moduleHealth?: IntelligenceModuleHealth[];
  intelFetchedAt?: string | null;
  demoMode?: boolean;
  intel?: MarketIntelligencePacket | null;
}) {
  const health = moduleHealth ?? intel?.moduleHealth ?? [];
  const src = sources ?? intel?.sources ?? [];

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">SoSoValue intelligence</h3>
        <span
          className={`text-xs rounded-full px-2 py-0.5 border ${
            demoMode
              ? "border-amber-800/50 text-amber-400 bg-amber-950/30"
              : "border-emerald-800/50 text-emerald-400 bg-emerald-950/30"
          }`}
        >
          {demoMode ? "Demo / snapshot" : "Live modules"}
        </span>
      </div>
      {intelFetchedAt && (
        <p className="text-xs text-muted">
          Packet captured: {new Date(intelFetchedAt).toLocaleString()}
        </p>
      )}
      {intel?.signals && intel.signals.length > 0 && (
        <p className="text-xs text-muted">
          {intel.signals.length} derived signals · risk-on{" "}
          {intel.marketPulse?.riskOnScore ?? 0}/100
        </p>
      )}
      {health.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {health.map((m) => {
            const count = moduleItemCount(m.module, intel);
            return (
              <li
                key={m.module}
                className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0"
              >
                <div className="flex justify-between gap-2">
                  <span>{m.label}</span>
                  <span
                    className={
                      m.status === "error"
                        ? "text-red-400 text-xs"
                        : "text-muted text-xs"
                    }
                  >
                    {m.status === "error"
                      ? m.error ?? "error"
                      : m.cacheHit
                        ? "cached"
                        : "live"}
                  </span>
                </div>
                <p className="text-[11px] text-muted font-mono truncate">
                  {m.endpoint}
                  {count != null ? ` · ${count} items` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      ) : src.length > 0 ? (
        <ul className="space-y-2 text-sm text-muted">
          {src.map((s) => (
            <li key={`${s.module}-${s.endpoint}`}>
              <span className="text-foreground">{s.label}</span> · {s.module}
              <p className="text-[11px] font-mono truncate">{s.endpoint}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No source attribution stored for this fund.
        </p>
      )}
      <p className="text-[11px] text-muted">
        Docs:{" "}
        <a
          href="https://sosovalue-1.gitbook.io/sosovalue-api-doc"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          SoSoValue OpenAPI
        </a>
      </p>
    </div>
  );
}
