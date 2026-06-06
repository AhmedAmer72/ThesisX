import { describe, expect, it, afterEach } from "vitest";
import {
  isDemoPacketAllowed,
  isMockExecutionAllowed,
  getExecutionMode,
} from "@/lib/buildathon";
import {
  isProductionMode,
  isDemoContentAllowed,
  isAiRequired,
} from "@/lib/production";

describe("production profile", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("disables mocks and demo in production mode", () => {
    process.env.PRODUCTION_MODE = "true";
    process.env.DEMO_MODE = "false";
    process.env.EXECUTION_MODE = "testnet";
    expect(isProductionMode()).toBe(true);
    expect(isMockExecutionAllowed()).toBe(false);
    expect(isDemoPacketAllowed()).toBe(false);
    expect(isDemoContentAllowed()).toBe(false);
    expect(getExecutionMode()).toBe("testnet");
  });

  it("requires AI in production by default", () => {
    process.env.PRODUCTION_MODE = "true";
    expect(isAiRequired()).toBe(true);
  });
});
