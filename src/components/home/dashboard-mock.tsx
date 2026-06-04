export function DashboardMock() {
  return (
    <div className="slash-card overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-elevated px-5 py-4">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        </div>
        <span className="text-xs text-muted">thesisx.app/dashboard</span>
      </div>
      <div className="grid md:grid-cols-[140px_1fr]">
        <aside className="bg-black p-4 text-foreground">
          <p className="text-xs font-semibold">ThesisX</p>
          <ul className="mt-4 space-y-2 text-[11px] opacity-70">
            {["Overview", "Portfolio", "Agents", "Execution"].map((item, index) => (
              <li
                key={item}
                className={
                  index === 0
                    ? "rounded-lg bg-foreground px-2 py-1 text-primary-foreground opacity-100"
                    : ""
                }
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Quantum Momentum Fund</h3>
            <span className="rounded-full border border-border bg-elevated px-3 py-1.5 text-xs">
              Active - Testnet
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "NAV", value: "$1.24M" },
              { label: "7d Return", value: "+12.4%" },
              { label: "Risk", value: "Medium" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-elevated p-4">
                <p className="text-[10px] uppercase text-muted">{m.label}</p>
                <p className="mt-1 text-sm font-semibold">{m.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {[
              { sym: "BTC", pct: 0.35 },
              { sym: "ETH", pct: 0.28 },
              { sym: "SOL", pct: 0.15 },
            ].map((row) => (
              <div key={row.sym} className="flex items-center gap-3 text-[11px]">
                <span className="w-8">{row.sym}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${row.pct * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {["Macro: Risk-on", "DeFi: Neutral", "ETF: Bullish"].map((vote) => (
              <div key={vote} className="rounded-2xl bg-elevated px-3 py-3 text-[11px]">
                {vote}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
