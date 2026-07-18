import { getExecutionMode } from "@/lib/buildathon";
import { listMappedSymbols } from "@/lib/sodex/symbols";

export type SodexReadiness = {
  ready: boolean;
  mode: string;
  spotBase: string;
  hasApiKey: boolean;
  hasPrivateKey: boolean;
  hasAccountId: boolean;
  hasUserAddress: boolean;
  mappedSymbols: string[];
  blockers: string[];
  warnings: string[];
};

export function getSodexReadiness(): SodexReadiness {
  const mode = getExecutionMode();
  const spotBase =
    process.env.SODEX_SPOT_BASE ??
    "https://testnet-gw.sodex.dev/api/v1/spot";
  const hasApiKey = Boolean(process.env.SODEX_API_KEY_NAME?.trim());
  const hasPrivateKey = Boolean(process.env.SODEX_API_PRIVATE_KEY?.trim());
  const hasAccountId = Boolean(process.env.SODEX_ACCOUNT_ID?.trim());
  const hasUserAddress = Boolean(process.env.SODEX_USER_ADDRESS?.trim());
  const mappedSymbols = listMappedSymbols();

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (mode === "mock") {
    blockers.push("Set EXECUTION_MODE=testnet for live execution");
  }
  if (mode === "testnet" || mode === "mainnet") {
    if (!hasUserAddress) {
      blockers.push("SODEX_USER_ADDRESS missing (master wallet)");
    }
    if (!hasApiKey) {
      blockers.push("SODEX_API_KEY_NAME missing — generate and register an API key");
    }
    if (!hasPrivateKey) {
      blockers.push("SODEX_API_PRIVATE_KEY missing — generate locally, never use master wallet key");
    }
    if (!hasAccountId) {
      warnings.push(
        "SODEX_ACCOUNT_ID missing — can be resolved from account state if user address is set"
      );
    }
    if (mappedSymbols.length === 0) {
      warnings.push("No SoDEX symbol mappings configured");
    }
  }

  const executionReady =
    mode !== "mock" &&
    hasApiKey &&
    hasPrivateKey &&
    (hasAccountId || hasUserAddress);

  return {
    ready: blockers.length === 0 && executionReady,
    mode,
    spotBase,
    hasApiKey,
    hasPrivateKey,
    hasAccountId,
    hasUserAddress,
    mappedSymbols,
    blockers,
    warnings,
  };
}
