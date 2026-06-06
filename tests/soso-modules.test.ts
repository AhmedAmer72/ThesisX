import { describe, expect, it } from "vitest";
import {
  buildNarratives,
  computeTopMovers,
  computeMarketPulse,
} from "@/lib/soso/modules";
import { getDemoIntelligencePacket } from "@/lib/soso/demo-data";

describe("soso modules helpers", () => {
  it("builds narratives and pulse from demo packet", () => {
    const packet = getDemoIntelligencePacket();
    const narratives = buildNarratives(packet);
    expect(narratives.length).toBeGreaterThan(0);
    packet.topMovers = computeTopMovers(packet);
    const pulse = computeMarketPulse(packet);
    expect(pulse.riskOnScore).toBeGreaterThanOrEqual(0);
    expect(packet.currencies.length).toBeGreaterThan(0);
  });
});
