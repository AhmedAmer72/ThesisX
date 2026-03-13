"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { WALLET_DISCONNECT_KEY } from "@/lib/wallet/constants";
import { persistWalletConnection } from "@/lib/wallet/utils";

export type WalletSessionStatus = "idle" | "linking" | "linked" | "error";

type WalletContextValue = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  sessionStatus: WalletSessionStatus;
  sessionError: string | null;
  isBackendLinked: boolean;
  retryLink: () => void;
};

type WalletSessionBridge = {
  setSessionStatus: Dispatch<SetStateAction<WalletSessionStatus>>;
  setSessionError: Dispatch<SetStateAction<string | null>>;
};

const WalletContext = createContext<WalletContextValue | null>(null);
const WalletSessionBridgeContext = createContext<WalletSessionBridge | null>(
  null
);

export function WalletPersistence() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const bridge = useContext(WalletSessionBridgeContext);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(WALLET_DISCONNECT_KEY) === "1"
    ) {
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linkWallet = useCallback(async () => {
    if (!address || !bridge) return;
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(WALLET_DISCONNECT_KEY) === "1"
    ) {
      return;
    }
    bridge.setSessionStatus("linking");
    bridge.setSessionError(null);
    try {
      await persistWalletConnection(address, signMessageAsync);
      bridge.setSessionStatus("linked");
      bridge.setSessionError(null);
    } catch (e) {
      bridge.setSessionStatus("error");
      bridge.setSessionError(
        e instanceof Error
          ? e.message
          : "Wallet linked in UI but backend session failed"
      );
    }
  }, [address, bridge, signMessageAsync]);

  useEffect(() => {
    if (!isConnected || !address) {
      bridge?.setSessionStatus("idle");
      bridge?.setSessionError(null);
      return;
    }
    void linkWallet();
  }, [address, isConnected, linkWallet, bridge]);

  return null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const [sessionStatus, setSessionStatus] =
    useState<WalletSessionStatus>("idle");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const bridge = useMemo(
    () => ({ setSessionStatus, setSessionError }),
    [setSessionStatus, setSessionError]
  );

  const retryLink = useCallback(() => {
    setSessionError(null);
    setSessionStatus("idle");
    setRetryTick((n) => n + 1);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      address: address ?? null,
      isConnected,
      isConnecting: isConnecting || isReconnecting,
      sessionStatus,
      sessionError,
      isBackendLinked: sessionStatus === "linked",
      retryLink,
    }),
    [
      address,
      isConnected,
      isConnecting,
      isReconnecting,
      sessionStatus,
      sessionError,
      retryLink,
      retryTick,
    ]
  );

  return (
    <WalletContext.Provider value={value}>
      <WalletSessionBridgeContext.Provider value={bridge}>
        {children}
      </WalletSessionBridgeContext.Provider>
    </WalletContext.Provider>
  );
}

/** App-specific wallet state (RainbowKit handles connect/disconnect UI). */
export function useWallet() {
  const ctx = useContext(WalletContext);
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();

  if (ctx) return ctx;

  return {
    address: address ?? null,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    sessionStatus: "idle" as WalletSessionStatus,
    sessionError: null,
    isBackendLinked: false,
    retryLink: () => undefined,
  };
}
