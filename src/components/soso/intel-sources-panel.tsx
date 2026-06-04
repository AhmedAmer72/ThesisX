"use client";

import type { IntelligenceModuleHealth, IntelligenceSource } from "@/lib/types";

export function IntelSourcesPanel({
  sources,
  moduleHealth,
  intelFetchedAt,
  demoMode,
}: {
  sources?: IntelligenceSource[];
  moduleHealth?: IntelligenceModuleHealth[];
  intelFetchedAt?: string | null;
  demoMode?: boolean;
}) {
  const health = moduleHealth ?? [];
  const src = sources ?? [];

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
      {health.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {health.map((m) => (
            <li
              key={m.module}
              className="flex justify-between gap-2 py-1 border-b border-border/50 last:border-0"
            >
              <span>{m.label}</span>
              <span
                className={
                  m.status === "error"
                    ? "text-red-400 text-xs"
                    : "text-muted text-xs"
                }
              >
                {m.status === "error" ? m.error ?? "error" : m.cacheHit ? "cached" : "live"}
              </span>
            </li>
          ))}
        </ul>
      ) : src.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted">
          {src.map((s) => (
            <li key={`${s.module}-${s.endpoint}`}>
              {s.label} · {s.module}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No source attribution stored for this fund.</p>
      )}
    </div>
  );
}
