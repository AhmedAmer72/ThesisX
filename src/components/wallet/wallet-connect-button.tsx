"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

type Variant = "header" | "settings";

export function WalletConnectButton({
  variant = "header",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const isHeader = variant === "header";

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            className={cn(
              !ready && "opacity-0 pointer-events-none",
              className
            )}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className={cn(
                      isHeader
                        ? "rounded-full border border-white/50 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 sm:px-4"
                        : "rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-border-strong"
                    )}
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className={cn(
                      isHeader
                        ? "rounded-full border border-red-400/60 px-3 py-2 text-sm text-red-300 sm:px-4"
                        : "rounded-xl border border-red-400/60 px-4 py-2 text-sm text-red-300"
                    )}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={openAccountModal}
                  className={cn(
                    isHeader
                      ? "rounded-full border border-white/25 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 sm:px-4"
                      : "rounded-xl border border-border bg-elevated px-4 py-2 text-sm font-medium hover:border-border-strong"
                  )}
                >
                  {account.displayName ?? account.address.slice(0, 6)}…
                  {account.address.slice(-4)}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
