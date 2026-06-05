import { getExecutionMode } from "@/lib/buildathon";
import { listMappedSymbols } from "@/lib/sodex/symbols";

export type SodexReadiness = {
  ready: boolean;
  mode: string;
  spotBase: string;
  hasApiKey: boolean;
  hasPrivateKey: boolean;
  hasAccountId: boolean;
  mappedSymbols: string[];
  blockers: string[];
};

export function getSodexReadiness(): SodexReadiness {
  const mode = getExecutionMode();
  const spotBase =
    process.env.SODEX_SPOT_BASE ??
    "https://testnet-gw.sodex.dev/api/v1/spot";
  const hasApiKey = Boolean(process.env.SODEX_API_KEY_NAME?.trim());
  const hasPrivateKey = Boolean(process.env.SODEX_API_PRIVATE_KEY?.trim());
  const hasAccountId = Boolean(process.env.SODEX_ACCOUNT_ID?.trim());
  const mappedSymbols = listMappedSymbols();

  const blockers: string[] = [];
  if (mode === "mock") {
    blockers.push("Set EXECUTION_MODE=testnet for live execution");
  }
  if (mode === "testnet" || mode === "mainnet") {
    if (!hasApiKey) blockers.push("SODEX_API_KEY_NAME missing");
    if (!hasPrivateKey) blockers.push("SODEX_API_PRIVATE_KEY missing");
    if (!hasAccountId) blockers.push("SODEX_ACCOUNT_ID missing");
  }

  return {
    ready: blockers.length === 0 && mode !== "mock",
    mode,
    spotBase,
    hasApiKey,
    hasPrivateKey,
    hasAccountId,
    mappedSymbols,
    blockers,
  };
}
