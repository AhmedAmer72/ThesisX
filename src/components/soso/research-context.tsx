import type { MarketIntelligencePacket } from "@/lib/types";

export function ResearchContext({
  intel,
}: {
  intel: MarketIntelligencePacket | null;
}) {
  if (!intel) return null;

  return (
    <section className="bg-surface rounded-2xl border border-border p-6 space-y-6">
      <h2 className="font-semibold">SoSo research context</h2>

      {intel.etf.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">ETF</p>
          <ul className="text-sm space-y-1">
            {intel.etf.slice(0, 4).map((e) => (
              <li key={e.name}>
                {e.name} {e.flow ? `· ${e.flow}` : ""}{" "}
                {e.changePct != null && `(${e.changePct}%)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {intel.macro.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Macro</p>
          <ul className="text-sm space-y-1 text-muted">
            {intel.macro.slice(0, 4).map((m) => (
              <li key={m.event}>
                {m.event}
                {m.date ? ` · ${m.date}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {intel.feeds.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Headlines</p>
          <ul className="text-sm space-y-2">
            {intel.feeds.slice(0, 3).map((f) => (
              <li key={f.title} className="line-clamp-2">
                {f.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {intel.benchmarks && intel.benchmarks.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Benchmarks</p>
          <div className="flex flex-wrap gap-2">
            {intel.benchmarks.map((b) => (
              <span
                key={b.name}
                className="text-xs rounded-full border border-border px-2 py-0.5"
              >
                {b.name}{" "}
                {b.changePct != null && (
                  <span className="text-emerald-400">+{b.changePct}%</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {intel.narrativeTags && intel.narrativeTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {intel.narrativeTags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="text-xs rounded-full bg-elevated border border-border px-2 py-0.5 text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
