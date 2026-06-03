import { defineChain } from "viem";

/** ValueChain Testnet — matches MetaMask / SoDEX testnet (chain ID 138565). */
export const valueChainTestnet = defineChain({
  id: 138565,
  name: "ValueChain Testnet",
  nativeCurrency: {
    name: "SOSO",
    symbol: "SOSO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.valuechain.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "ValueChain Scan",
      url: "https://testnet-scan.valuechain.xyz",
    },
  },
  testnet: true,
});
