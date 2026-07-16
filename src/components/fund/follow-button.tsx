"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { Button } from "@/components/ui/button";

export function FollowButton({
  fundId,
  fundSlug,
}: {
  fundId: string;
  fundSlug?: string;
}) {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [following, setFollowing] = useState(false);
  const [allocationPct, setAllocationPct] = useState(100);
  const [loading, setLoading] = useState(false);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(
    fundSlug ?? null
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    void fetchWithWallet(`/api/copy?fundId=${fundId}`, address)
      .then((r) => r.json())
      .then((d) => {
        setFollowing(Boolean(d.following));
        if (typeof d.allocationPct === "number") setAllocationPct(d.allocationPct);
        if (typeof d.fundSlug === "string") setResolvedSlug(d.fundSlug);
      })
      .catch(() => {});
  }, [address, fundId]);

  async function toggle() {
    if (!address) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithWallet("/api/copy", address, {
        method: "POST",
        body: JSON.stringify({
          fundId,
          action: following ? "unfollow" : "follow",
          allocationPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      if (following) {
        setFollowing(false);
        setMessage("Stopped mirroring");
      } else {
        setFollowing(true);
        const slug = (data.fundSlug as string | undefined) ?? resolvedSlug;
        if (slug) {
          setResolvedSlug(slug);
          router.push(`/dashboard/following/${slug}`);
          return;
        }
        setMessage("Paper mirror activated — open Dashboard → Paper strategy mirrors");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
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
    <div className="flex flex-col gap-2">
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
          onClick={() => void toggle()}
          disabled={loading}
        >
          {loading
            ? "…"
            : following
              ? "Stop mirroring"
              : "Open paper mirror"}
        </Button>
        {following && resolvedSlug && (
          <Link
            href={`/dashboard/following/${resolvedSlug}`}
            className="text-xs text-muted hover:text-foreground underline-offset-2 hover:underline"
          >
            View paper book →
          </Link>
        )}
      </div>
      <p className="text-[11px] text-muted">
        Paper strategy mirror · no capital at risk · syncs on leader execute/rebalance
      </p>
      {message && <p className="text-xs text-amber-200/90">{message}</p>}
    </div>
  );
}
