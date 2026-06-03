"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { useSyncExternalStore } from "react";
import { WagmiProvider } from "wagmi";
import { valueChainTestnet } from "@/lib/wagmi/chains";
import { wagmiConfig } from "@/lib/wagmi/config";
import {
  WALLET_DISCONNECT_KEY,
  WALLET_PREFERENCE_EVENT,
} from "@/lib/wallet/constants";
import { WalletPersistence } from "@/components/providers/wallet-provider";

const queryClient = new QueryClient();

function subscribeReconnectFlag(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WALLET_PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WALLET_PREFERENCE_EVENT, onStoreChange);
  };
}

function getReconnectOnMount(): boolean {
  return localStorage.getItem(WALLET_DISCONNECT_KEY) !== "1";
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const reconnectOnMount = useSyncExternalStore(
    subscribeReconnectFlag,
    getReconnectOnMount,
    () => false
  );

  return (
    <WagmiProvider
      config={wagmiConfig}
      reconnectOnMount={reconnectOnMount}
    >
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={valueChainTestnet}
          theme={darkTheme({
            accentColor: "#c9a227",
            accentColorForeground: "#0a0a0a",
            borderRadius: "large",
          })}
        >
          <WalletPersistence />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
