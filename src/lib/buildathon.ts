/** Buildathon / live-only submission profile helpers. */

import {
  getDefaultExecutionMode,
  isDemoContentAllowed,
  isProductionMode,
} from "@/lib/production";

export function isBuildathonMode(): boolean {
  return process.env.BUILDATHON_MODE === "true";
}

export function isLiveIntelligenceRequired(): boolean {
  return (
    isProductionMode() ||
    process.env.DEMO_MODE !== "true" ||
    isBuildathonMode()
  );
}

export function getExecutionMode(): "mock" | "testnet" | "mainnet" {
  if (isBuildathonMode() || isProductionMode()) {
    const m = process.env.EXECUTION_MODE;
    if (m === "mainnet" && process.env.ALLOW_MAINNET === "true") return "mainnet";
    return "testnet";
  }
  const m = process.env.EXECUTION_MODE ?? getDefaultExecutionMode();
  if (m === "testnet" || m === "mainnet") return m;
  return "mock";
}

export function isMockExecutionAllowed(): boolean {
  if (isBuildathonMode() || isProductionMode()) return false;
  return getExecutionMode() === "mock";
}

export function isDemoPacketAllowed(): boolean {
  if (isBuildathonMode() || isProductionMode()) return false;
  return isDemoContentAllowed();
}

export function isCronSecretRequired(): boolean {
  return (
    isBuildathonMode() ||
    process.env.NODE_ENV === "production"
  );
}
