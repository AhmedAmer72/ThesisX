"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TapeOrder = {
  id?: string;
  symbol: string;
  side: string;
  quantity: string;
  status: string;
  mode: string;
  externalRef?: string | null;
  nonce?: string | null;
  createdAt: string;
  updatedAt?: string;
};

function statusClass(status: string) {
  if (["submitted", "filled", "reconciled", "filled_simulated"].includes(status)) {
    return "text-emerald-400";
  }
  if (["failed", "error"].includes(status)) return "text-red-400";
  return "text-muted";
}

export function LiveOrderTape({
  slug,
  fundId,
  initialOrders,
}: {
  slug: string;
  fundId: string;
  initialOrders: TapeOrder[];
}) {
  const { address } = useWallet();
  const [orders, setOrders] = useState<TapeOrder[]>(initialOrders);
  const [streamStatus, setStreamStatus] = useState<
    "connecting" | "live" | "idle"
  >("connecting");
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (refresh = false) => {
      if (!address) return;
      setRefreshing(true);
      setError(null);
      try {
        const res = await fetchWithWallet(
          `/api/funds/${encodeURIComponent(slug)}/orders${
            refresh ? "?refresh=true" : ""
          }`,
          address
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load orders");
        setOrders(data.orders ?? []);
        if (data.reconciliation) {
          setLastEvent(
            `Reconciled ${data.reconciliation.ordersChecked} · updated ${data.reconciliation.updated}`
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setRefreshing(false);
      }
    },
    [address, slug]
  );

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    if (!fundId) return;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    try {
      es = new EventSource(
        `/api/stream?channel=${encodeURIComponent(`fund:${fundId}`)}`
      );
      es.onopen = () => setStreamStatus("live");
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as {
            type: string;
            payload?: {
              orders?: TapeOrder[];
              updated?: number;
              ordersChecked?: number;
            };
            ts?: string;
          };
          if (msg.type === "order_snapshot" && Array.isArray(msg.payload?.orders)) {
            setOrders(msg.payload!.orders!);
            setLastEvent(`Tape sync ${new Date(msg.ts ?? Date.now()).toLocaleTimeString()}`);
            setStreamStatus("live");
          }
          if (
            msg.type === "order_tape" ||
            msg.type === "reconcile" ||
            msg.type === "orders_submitted"
          ) {
            setLastEvent(
              `${msg.type.replace(/_/g, " ")} · ${new Date(
                msg.ts ?? Date.now()
              ).toLocaleTimeString()}`
            );
            void loadOrders(false);
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        setStreamStatus("idle");
      };
    } catch {
      setStreamStatus("idle");
    }

    // Poll fallback every 20s for owners
    poll = setInterval(() => {
      if (address) void loadOrders(false);
    }, 20_000);

    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [fundId, address, loadOrders]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5",
              streamStatus === "live"
                ? "border-emerald-800/50 text-emerald-400"
                : "border-border text-muted"
            )}
          >
            {streamStatus === "live" ? "Live tape" : "Polling"}
          </span>
          {lastEvent && <span className="text-muted">{lastEvent}</span>}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={refreshing || !address}
          onClick={() => void loadOrders(true)}
        >
          {refreshing ? "…" : "Reconcile now"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-sm text-muted">
          No execution orders yet. Approve a pending trade intent to submit SoDEX
          testnet orders — they appear here live.
        </p>
      ) : (
        <ul className="space-y-1 max-h-80 overflow-y-auto font-mono text-xs">
          {orders.map((o) => (
            <li
              key={o.id ?? `${o.symbol}-${o.nonce ?? o.createdAt}`}
              className="flex flex-wrap justify-between gap-2 border-b border-border/40 py-2 last:border-0"
            >
              <span className="text-foreground">
                <span className="text-muted">
                  {new Date(o.createdAt).toLocaleTimeString()}
                </span>{" "}
                {o.side.toUpperCase()} {o.quantity} {o.symbol}
              </span>
              <span className={statusClass(o.status)}>
                {o.status}
                {o.externalRef ? ` · ${o.externalRef.slice(0, 18)}` : ""}
                {o.mode ? ` · ${o.mode}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
