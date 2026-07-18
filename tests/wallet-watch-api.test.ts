import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const requireWalletUser = vi.fn();
const userHasFeature = vi.fn();
const findMany = vi.fn();
const count = vi.fn();
const findUnique = vi.fn();
const upsert = vi.fn();
const deleteMany = vi.fn();
const userFindUnique = vi.fn();

vi.mock("@/lib/auth/wallet", () => ({
  getWalletFromRequest: () => "0xd208ac8327e6479967693af2f2216e1612d0171a",
  requireWalletUser: (...args: unknown[]) => requireWalletUser(...args),
}));

vi.mock("@/lib/entitlements", () => ({
  userHasFeature: (...args: unknown[]) => userHasFeature(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    walletWatch: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      findUnique: (...args: unknown[]) => findUnique(...args),
      upsert: (...args: unknown[]) => upsert(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
    },
  },
}));

describe("wallet watch API", () => {
  beforeEach(() => {
    requireWalletUser.mockResolvedValue({ ok: true, userId: "u1" });
    userHasFeature.mockResolvedValue(false);
    userFindUnique.mockResolvedValue({ plan: "free" });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({
      id: "w1",
      address: "0xd208ac8327e6479967693af2f2216e1612d0171a",
      label: null,
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("lists watches with free-tier limit", async () => {
    const { GET } = await import("@/app/api/wallets/watch/route");
    const res = await GET(
      new NextRequest("http://localhost/api/wallets/watch")
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.limit).toBe(1);
    expect(json.hasAdvancedIntel).toBe(false);
  });

  it("allows adding a watch under the limit", async () => {
    const { POST } = await import("@/app/api/wallets/watch/route");
    const res = await POST(
      new NextRequest("http://localhost/api/wallets/watch", {
        method: "POST",
        body: JSON.stringify({
          address: "0xd208ac8327e6479967693af2f2216e1612d0171a",
          label: "Treasury",
        }),
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.watch.id).toBe("w1");
  });

  it("blocks when watch limit reached", async () => {
    count.mockResolvedValue(1);
    const { POST } = await import("@/app/api/wallets/watch/route");
    const res = await POST(
      new NextRequest("http://localhost/api/wallets/watch", {
        method: "POST",
        body: JSON.stringify({
          address: "0x1111111111111111111111111111111111111111",
        }),
      })
    );
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.code).toBe("watch_limit");
  });
});
