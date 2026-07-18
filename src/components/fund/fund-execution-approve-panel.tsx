"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { signExecutionApproval } from "@/lib/wallet/approval-client";

type PendingIntent = {
  id: string;
  status: string;
  kind?: string;
};

export function FundExecutionApprovePanel({
  slug,
  fundStatus,
  pendingIntents,
}: {
  slug: string;
  fundStatus: string;
  pendingIntents: PendingIntent[];
}) {
  const { address, isBackendLinked } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = pendingIntents.find((t) =>
    ["pending_review", "pending_approval"].includes(t.status)
  );

  if (fundStatus !== "pending_review" || !pending) return null;

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-amber-100">Pending initial execution</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          This fund is waiting for your signed approval before SoDEX testnet orders
          are submitted. You can also approve from{" "}
          <Link href={`/create?slug=${slug}`} className="underline">
            Create review
          </Link>
          .
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={disclosureAccepted}
          onChange={(e) => setDisclosureAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>
          I understand ThesisX uses AI-generated allocations and testnet execution. I
          accept execution and market risks.
        </span>
      </label>

      {address && !isBackendLinked && (
        <p className="text-xs text-amber-400">
          Waiting for wallet session — check your wallet for a sign request before approving.
        </p>
      )}

      <Button
        disabled={!disclosureAccepted || approving || !address || !isBackendLinked}
        onClick={async () => {
          if (!address) return;
          setApproving(true);
          setError(null);
          setMessage(null);
          try {
            const approval = await signExecutionApproval(address, signMessageAsync, {
              action: "fund_execute",
              slug,
              intentId: pending.id,
            });
            const res = await fetchWithWallet(`/api/funds/${slug}/approve`, address, {
              method: "POST",
              body: JSON.stringify({
                disclosureAccepted: true,
                intentId: pending.id,
                approvalSignature: approval.approvalSignature,
                approvalTimestamp: approval.approvalTimestamp,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Approval failed");
            setMessage(
              data.execution?.message ??
                "Execution submitted. Refresh to see order references."
            );
            window.location.reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Approval failed");
          } finally {
            setApproving(false);
          }
        }}
      >
        {approving ? "Sign & Execute..." : "Sign & Approve Execution"}
      </Button>

      {message && <p className="text-sm text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
