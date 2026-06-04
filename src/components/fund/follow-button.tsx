"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { Button } from "@/components/ui/button";

export function FollowButton({ fundId }: { fundId: string }) {
  const { address, isConnected } = useWallet();
  const [following, setFollowing] = useState(false);
  const [allocationPct, setAllocationPct] = useState(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    void fetchWithWallet(`/api/copy?fundId=${fundId}`, address)
      .then((r) => r.json())
      .then((d) => {
        setFollowing(Boolean(d.following));
        if (typeof d.allocationPct === "number") setAllocationPct(d.allocationPct);
      })
      .catch(() => {});
  }, [address, fundId]);

  async function toggle() {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetchWithWallet("/api/copy", address, {
        method: "POST",
        body: JSON.stringify({
          fundId,
          action: following ? "unfollow" : "follow",
          allocationPct,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setFollowing(!following);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <span className="text-xs text-muted">Connect wallet to follow</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!following && (
        <label className="text-xs text-muted">
          Mirror %
          <input
            type="number"
            min={10}
            max={100}
            step={10}
            value={allocationPct}
            onChange={(e) => setAllocationPct(Number(e.target.value))}
            className="ml-2 w-16 rounded border border-border bg-surface px-2 py-1 text-xs"
          />
        </label>
      )}
      <Button
        size="sm"
        variant={following ? "secondary" : "primary"}
        onClick={toggle}
        disabled={loading}
      >
        {following ? "Stop mirroring" : "Mirror watchlist"}
      </Button>
    </div>
  );
}
