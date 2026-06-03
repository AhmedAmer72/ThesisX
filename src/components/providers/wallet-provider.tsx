"use client";

import { useEffect } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { WALLET_DISCONNECT_KEY } from "@/lib/wallet/constants";
import { persistWalletConnection } from "@/lib/wallet/utils";

export function WalletPersistence() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(WALLET_DISCONNECT_KEY) === "1"
    ) {
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(WALLET_DISCONNECT_KEY) === "1"
    ) {
      return;
    }
    void persistWalletConnection(address, signMessageAsync).catch(() => {});
  }, [address, isConnected, signMessageAsync]);

  return null;
}

/** App-specific wallet state (RainbowKit handles connect/disconnect UI). */
export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();

  return {
    address: address ?? null,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
  };
}
