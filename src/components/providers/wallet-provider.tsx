"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { WALLET_DISCONNECT_KEY } from "@/lib/wallet/constants";
import { persistWalletConnection } from "@/lib/wallet/utils";
import { setStoredSession } from "@/lib/wallet/session";

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
  /** Incremented by retryLink; WalletPersistence uses it as an effect trigger. */
  retryCount: number;
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
  const wasConnectedRef = useRef(false);

  // On mount: honour explicit disconnect preference
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(WALLET_DISCONNECT_KEY) === "1"
    ) {
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track user-initiated disconnects so reconnectOnMount flag stays correct
  useEffect(() => {
    if (wasConnectedRef.current && !isConnected) {
      if (typeof window !== "undefined") {
        localStorage.setItem(WALLET_DISCONNECT_KEY, "1");
      }
      // Clear stale session immediately
      setStoredSession(null);
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

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
      // Clear any stale token from a previous wallet before persisting the new one
      setStoredSession(null);
      await persistWalletConnection(address, signMessageAsync);
      // Connected intentionally — allow reconnect on next page load
      if (typeof window !== "undefined") {
        localStorage.removeItem(WALLET_DISCONNECT_KEY);
      }
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

  const retryCount = bridge?.retryCount ?? 0;

  useEffect(() => {
    if (!isConnected || !address) {
      // Ensure stale session is cleared on disconnect
      setStoredSession(null);
      bridge?.setSessionStatus("idle");
      bridge?.setSessionError(null);
      return;
    }
    void linkWallet();
    // retryCount is intentionally included: retryLink increments it to re-trigger signing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, linkWallet, bridge, retryCount]);

  return null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const [sessionStatus, setSessionStatus] =
    useState<WalletSessionStatus>("idle");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const bridge = useMemo(
    () => ({ setSessionStatus, setSessionError, retryCount }),
    [setSessionStatus, setSessionError, retryCount]
  );

  const retryLink = useCallback(() => {
    setSessionError(null);
    setSessionStatus("idle");
    setRetryCount((n) => n + 1);
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
