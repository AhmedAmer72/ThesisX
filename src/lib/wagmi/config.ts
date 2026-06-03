import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { valueChainTestnet } from "@/lib/wagmi/chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

const allowMainnet = process.env.NEXT_PUBLIC_ALLOW_MAINNET === "true";

if (!walletConnectProjectId) {
  console.warn(
    "[ThesisX] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing — WalletConnect will not work. Get one at https://cloud.reown.com"
  );
}

const chains = allowMainnet
  ? ([valueChainTestnet, mainnet] as const)
  : ([valueChainTestnet] as const);

export const appChains = chains;

export const wagmiConfig = getDefaultConfig({
  appName: "ThesisX",
  projectId: walletConnectProjectId || "00000000000000000000000000000000",
  chains,
  ssr: true,
});
