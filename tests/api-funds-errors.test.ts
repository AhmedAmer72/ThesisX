import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { FundSetupError } from "@/lib/fund/errors";
import { SosoLiveRequiredError } from "@/lib/soso/errors";

const createFundFromPrompt = vi.fn();

vi.mock("@/lib/fund/service", () => ({
  createFundFromPrompt: (...args: unknown[]) => createFundFromPrompt(...args),
}));

vi.mock("@/lib/auth/wallet", () => ({
  getWalletFromRequest: () => "0xd208ac8327e6479967693af2f2216e1612d0171a",
  requireWalletUser: async () => ({ ok: true, user: { id: "u1" } }),
  resolveUserFromWallet: async () => ({ id: "u1" }),
}));

describe("POST /api/funds error mapping", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    createFundFromPrompt.mockReset();
    process.env.BUILDATHON_MODE = "true";
  });

  afterEach(() => {
    process.env = { ...prev };
    vi.resetModules();
  });

  async function postFunds() {
    const { POST } = await import("@/app/api/funds/route");
    const req = new NextRequest("http://localhost/api/funds", {
      method: "POST",
      headers: { "x-wallet-address": "0xd208ac8327e6479967693af2f2216e1612d0171a" },
      body: JSON.stringify({
        prompt: "Create a medium-risk AI infrastructure fund for testing",
      }),
    });
    return POST(req);
  }

  it("maps no tradable assets to 422", async () => {
    createFundFromPrompt.mockRejectedValue(
      new FundSetupError("No tradable assets", "no_tradable_assets", {
        unmapped: ["LINK"],
        unpriced: ["00"],
      })
    );
    const res = await postFunds();
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.code).toBe("no_tradable_assets");
    expect(json.details?.unmapped).toContain("LINK");
  });

  it("maps SoSo live failures to 502", async () => {
    createFundFromPrompt.mockRejectedValue(
      new SosoLiveRequiredError("Only 2/9 modules", { currency: "timeout" })
    );
    const res = await postFunds();
    const json = await res.json();
    expect(res.status).toBe(502);
    expect(json.code).toBe("live_fetch_failed");
    expect(json.moduleErrors).toBeDefined();
  });

  it("maps wallet requirement to 401", async () => {
    createFundFromPrompt.mockRejectedValue(
      new Error("Connect wallet before creating a fund.")
    );
    const res = await postFunds();
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.code).toBe("wallet_required");
  });
});
