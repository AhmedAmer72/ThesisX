import { describe, expect, it } from "vitest";
import { nextExecutionNonce, peekExecutionNonce } from "@/lib/sodex/nonce";

describe("execution nonce", () => {
  it("increments deterministically", async () => {
    const a = await nextExecutionNonce();
    const b = await nextExecutionNonce();
    expect(BigInt(b) - BigInt(a)).toBe(1n);
    const peek = await peekExecutionNonce();
    expect(peek).toBe(b);
  });
});
