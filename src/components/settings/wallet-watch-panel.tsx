"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/wallet/utils";

type Watch = {
  id: string;
  address: string;
  label: string | null;
  chainId: number;
  createdAt: string;
};

export function WalletWatchPanel() {
  const { address, isConnected } = useWallet();
  const [watches, setWatches] = useState<Watch[]>([]);
  const [limit, setLimit] = useState(1);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [input, setInput] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      const res = await fetchWithWallet("/api/wallets/watch", address);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load watches");
      setWatches(data.watches ?? []);
      setLimit(data.limit ?? 1);
      setHasAdvanced(Boolean(data.hasAdvancedIntel));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) void load();
  }, [isConnected, address, load]);

  async function addWatch(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetchWithWallet("/api/wallets/watch", address, {
        method: "POST",
        body: JSON.stringify({
          address: input.trim(),
          label: label.trim() || undefined,
          chainId: 138565,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setInput("");
      setLabel("");
      setMessage("Wallet added to watchlist");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeWatch(id: string) {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetchWithWallet(
        `/api/wallets/watch?id=${encodeURIComponent(id)}`,
        address,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function unlockAdvanced() {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithWallet("/api/entitlements", address, {
        method: "POST",
        body: JSON.stringify({ feature: "advanced_intel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unlock failed");
      setMessage("Advanced intel unlocked — more watch slots available");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <p className="text-sm text-muted">
        Connect your wallet to manage address watchlists.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Track ValueChain / SoDEX-related addresses for advanced intel. Free tier
        includes {limit} slot{limit === 1 ? "" : "s"}
        {!hasAdvanced ? " — unlock advanced intel for more" : ""}.
      </p>

      <form onSubmit={(e) => void addWatch(e)} className="space-y-3">
        <label className="block text-xs text-muted uppercase tracking-wider">
          Address
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x…"
            className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm font-mono"
            required
          />
        </label>
        <label className="block text-xs text-muted uppercase tracking-wider">
          Label (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Treasury / competitor / LP"
            className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={loading || !input.trim()}>
            {loading ? "…" : "Add watch"}
          </Button>
          {!hasAdvanced && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={() => void unlockAdvanced()}
            >
              Unlock advanced intel (MVP)
            </Button>
          )}
        </div>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}

      <div>
        <p className="text-xs uppercase tracking-wider text-muted mb-2">
          Watching {watches.length}/{limit}
        </p>
        {watches.length === 0 ? (
          <p className="text-sm text-muted">No wallets watched yet.</p>
        ) : (
          <ul className="space-y-2">
            {watches.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {w.label || "Untitled"}
                  </p>
                  <p className="text-xs font-mono text-muted truncate">
                    {shortenAddress(w.address, 6)}
                  </p>
                  <p className="text-[10px] text-muted">
                    chain {w.chainId} · added{" "}
                    {new Date(w.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => void removeWatch(w.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
