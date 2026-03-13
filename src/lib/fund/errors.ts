export class FundSetupError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FundSetupError";
  }
}

export function isFundSetupError(e: unknown): e is FundSetupError {
  return e instanceof FundSetupError;
}
