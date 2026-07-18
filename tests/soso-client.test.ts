import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SosoClient } from "@/lib/soso/client";
import { SosoSetupError } from "@/lib/soso/errors";

describe("SosoClient", () => {
  const originalKey = process.env.SOSOVALUE_API_KEY;
  const originalDemo = process.env.DEMO_MODE;
  const originalMin = process.env.SOSO_MIN_MODULES_OK;

  beforeEach(() => {
    const jsonResponse = (body: unknown, ok = true, status = 200) => {
      const text = JSON.stringify(body);
      return {
        ok,
        status,
        text: async () => text,
        json: async () => body,
      };
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const method = init?.method ?? "GET";
        if (method === "POST" && u.includes("coin/list")) {
          return jsonResponse({
            code: 0,
            data: [
              { currencyName: "ETH", fullName: "Ethereum" },
              { currencyName: "BTC", fullName: "Bitcoin" },
            ],
          });
        }
        if (method === "POST" && u.includes("currentEtfDataMetrics")) {
          return jsonResponse({
            code: 0,
            data: {
              list: [
                {
                  ticker: "IBIT",
                  dailyNetInflow: { value: 100 },
                },
              ],
            },
          });
        }
        if (u.includes("macro/events")) {
          return jsonResponse({
            code: 0,
            data: [{ date: "2026-06-08", events: ["CPI"] }],
          });
        }
        if (u.includes("crypto-stocks/sectors")) {
          return jsonResponse({
            code: 0,
            data: [
              {
                sector_slug: "ai",
                sector_name: "AI",
                change_percent: 2.5,
              },
            ],
          });
        }
        return jsonResponse({}, false, 404);
      })
    );
  });

  afterEach(() => {
    process.env.SOSOVALUE_API_KEY = originalKey;
    process.env.DEMO_MODE = originalDemo;
    if (originalMin === undefined) delete process.env.SOSO_MIN_MODULES_OK;
    else process.env.SOSO_MIN_MODULES_OK = originalMin;
    vi.unstubAllGlobals();
  });

  it("throws SosoSetupError in liveOnly mode without API key", async () => {
    delete process.env.SOSOVALUE_API_KEY;
    process.env.DEMO_MODE = "false";
    const client = new SosoClient();
    await expect(
      client.buildIntelligencePacket({ liveOnly: true })
    ).rejects.toBeInstanceOf(SosoSetupError);
  });

  it("builds live packet with module health when key present", async () => {
    process.env.SOSOVALUE_API_KEY = "test-key";
    process.env.DEMO_MODE = "false";
    process.env.SOSO_MIN_MODULES_OK = "3";
    const client = new SosoClient();
    const packet = await client.buildIntelligencePacket({
      liveOnly: true,
      useCache: false,
    });
    expect(packet.demoMode).toBe(false);
    expect(packet.currencies.length).toBeGreaterThan(0);
    expect(packet.macro.length).toBeGreaterThan(0);
    expect(packet.moduleHealth?.some((m) => m.status === "ok")).toBe(true);
  }, 30000);
});
