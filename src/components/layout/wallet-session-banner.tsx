"use client";

import { useWallet } from "@/components/providers/wallet-provider";
import { Button } from "@/components/ui/button";

export function WalletSessionBanner() {
  const { isConnected, sessionStatus, sessionError, retryLink } = useWallet();

  if (!isConnected || sessionStatus === "linked" || sessionStatus === "idle") {
    return null;
  }

  if (sessionStatus === "linking") {
    return (
      <div className="border-b border-amber-500/30 bg-amber-950/30 px-4 py-2 text-center text-xs text-amber-100">
        Linking wallet session — confirm the sign-in message in your wallet…
      </div>
    );
  }

  return (
    <div className="border-b border-red-500/30 bg-red-950/30 px-4 py-2 text-center text-xs text-red-100">
      Wallet session failed: {sessionError ?? "unknown error"}.{" "}
      <Button
        variant="secondary"
        className="ml-2 h-7 px-2 text-xs"
        onClick={retryLink}
      >
        Retry sign-in
      </Button>
    </div>
  );
}
