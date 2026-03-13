"use client";

export function ExecutionOrdersPanel({
  orders,
  executionMode,
}: {
  orders: {
    symbol: string;
    side: string;
    quantity: string;
    status: string;
    mode: string;
    externalRef?: string | null;
    nonce?: string | null;
    createdAt: string;
  }[];
  executionMode?: string;
}) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted">
        No execution orders yet. Approve a pending trade intent to submit SoDEX
        testnet orders.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {executionMode && (
        <p className="text-xs text-muted uppercase tracking-wide">
          Mode: {executionMode}
        </p>
      )}
      <ul className="space-y-2 text-sm">
        {orders.map((o) => (
          <li
            key={`${o.symbol}-${o.nonce ?? o.createdAt}`}
            className="flex flex-wrap justify-between gap-2 py-2 border-b border-border/50 last:border-0"
          >
            <span>
              {o.side.toUpperCase()} {o.quantity} {o.symbol}
            </span>
            <span
              className={
                o.status === "submitted" || o.status === "filled"
                  ? "text-emerald-400 text-xs"
                  : o.status === "failed" || o.status === "error"
                    ? "text-red-400 text-xs"
                    : "text-muted text-xs"
              }
            >
              {o.status}
              {o.externalRef ? ` · ${o.externalRef}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
