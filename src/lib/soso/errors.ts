export class SosoSetupError extends Error {
  code = "missing_api_key" as const;
  constructor(message = "SOSOVALUE_API_KEY is required for live SoSo intelligence.") {
    super(message);
    this.name = "SosoSetupError";
  }
}

export class SosoLiveRequiredError extends Error {
  code = "live_fetch_failed" as const;
  constructor(
    message = "Live SoSoValue fetch failed. Configure SOSOVALUE_API_KEY and verify API access.",
    public readonly moduleErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "SosoLiveRequiredError";
  }
}

export function isSosoSetupError(e: unknown): e is SosoSetupError {
  return e instanceof SosoSetupError;
}

export function isSosoLiveRequiredError(
  e: unknown
): e is SosoLiveRequiredError {
  return (
    e instanceof SosoLiveRequiredError ||
    (e instanceof Error && e.name === "SosoLiveRequiredError")
  );
}
