/**
 * Production profile helpers — fail-closed live data, no mocks in prod surfaces.
 */

export function isProductionMode(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.BUILDATHON_MODE === "true" ||
    process.env.PRODUCTION_MODE === "true"
  );
}

/** OpenAI is required only when explicitly enabled via OPENAI_REQUIRED=true. */
export function isAiRequired(): boolean {
  return isProductionMode() && process.env.OPENAI_REQUIRED === "true";
}

export function isAiEnhancementAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isDemoContentAllowed(): boolean {
  if (isProductionMode()) return false;
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.SOSO_ALLOW_DEMO === "true"
  );
}

export function requireWalletSessionSecret(): boolean {
  return isProductionMode();
}

export function getDefaultExecutionMode(): "mock" | "testnet" | "mainnet" {
  if (isProductionMode()) return "testnet";
  return "mock";
}
