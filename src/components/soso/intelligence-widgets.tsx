"use client";

import type { MarketIntelligencePacket } from "@/lib/types";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-elevated/60 p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {title}
      </h3>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </div>
  );
}

export function IntelligenceWidgets({
  intel,
}: {
  intel: MarketIntelligencePacket | null;
}) {
  if (!intel) {
    return (
      <p className="text-sm text-muted">
        No intelligence snapshot — refresh live SoSo data from the dashboard.
      </p>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Panel title="ETF flows">
        {intel.etf.length === 0 ? (
          <p className="text-muted">No ETF data</p>
        ) : (
          intel.etf.slice(0, 4).map((e) => (
            <div key={e.name} className="flex justify-between gap-2">
              <span>{e.name}</span>
              <span className="text-muted">
                {e.flow ?? "—"} {e.changePct != null ? `(${e.changePct}%)` : ""}
              </span>
            </div>
          ))
        )}
      </Panel>

      <Panel title="Macro calendar">
        {intel.macro.length === 0 ? (
          <p className="text-muted">No macro events</p>
        ) : (
          intel.macro.slice(0, 5).map((m, i) => (
            <div key={`${m.event}-${i}`}>
              <span className="font-medium">{m.event}</span>
              {m.date && (
                <span className="text-muted ml-2 text-xs">{m.date}</span>
              )}
            </div>
          ))
        )}
      </Panel>

      <Panel title="SSI indexes">
        {intel.indexes.length === 0 ? (
          <p className="text-muted">No index data</p>
        ) : (
          intel.indexes.slice(0, 5).map((i) => (
            <div key={i.name} className="flex justify-between">
              <span>{i.name}</span>
              <span
                className={
                  (i.changePct ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                }
              >
                {i.changePct != null ? `${i.changePct.toFixed(1)}%` : "—"}
              </span>
            </div>
          ))
        )}
      </Panel>

      <Panel title="BTC treasuries">
        {intel.btcTreasuries.length === 0 ? (
          <p className="text-muted">No treasury data</p>
        ) : (
          intel.btcTreasuries.slice(0, 4).map((b) => (
            <div key={b.company} className="flex justify-between">
              <span>{b.company}</span>
              <span className="text-muted">
                {b.btcHoldings?.toLocaleString() ?? "—"} BTC
              </span>
            </div>
          ))
        )}
      </Panel>

      <Panel title="Fundraising heat">
        {intel.fundraising.length === 0 ? (
          <p className="text-muted">No fundraising data</p>
        ) : (
          intel.fundraising.slice(0, 5).map((f) => (
            <div key={f.project}>
              <span className="font-medium">{f.project}</span>
              {f.amount && (
                <span className="text-muted ml-2">{f.amount}</span>
              )}
            </div>
          ))
        )}
      </Panel>

      <Panel title="Top movers">
        {(intel.topMovers ?? []).length === 0 ? (
          <p className="text-muted">No movers</p>
        ) : (
          intel.topMovers!.slice(0, 5).map((m) => (
            <div key={m.symbol} className="flex justify-between">
              <span>{m.symbol}</span>
              <span
                className={
                  m.change24h >= 0 ? "text-emerald-600" : "text-red-600"
                }
              >
                {m.change24h >= 0 ? "+" : ""}
                {m.change24h.toFixed(1)}%
              </span>
            </div>
          ))
        )}
      </Panel>

      {intel.charts && intel.charts.length > 0 && (
        <Panel title="Analysis charts">
          {intel.charts.slice(0, 4).map((c) => (
            <div key={c.id}>
              <span className="font-medium">{c.title}</span>
              {c.category && (
                <span className="text-muted ml-2 text-xs">{c.category}</span>
              )}
            </div>
          ))}
        </Panel>
      )}

      {intel.marketPulse && (
        <Panel title="Market pulse">
          <div className="flex justify-between">
            <span>Risk-on score</span>
            <span className="font-semibold">
              {intel.marketPulse.riskOnScore}/100
            </span>
          </div>
          {intel.marketPulse.topHeadline && (
            <p className="text-muted text-xs mt-2 line-clamp-2">
              {intel.marketPulse.topHeadline}
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
