import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/wallet/connect/route";
import { NextRequest } from "next/server";

describe("/api/wallet/connect", () => {
  const testAddress = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01";

  it("POST upserts user by wallet address", async () => {
    const req = new NextRequest("http://localhost/api/wallet/connect", {
      method: "POST",
      body: JSON.stringify({ address: testAddress }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.userId).toBeDefined();
    expect(body.walletAddress).toBe(testAddress.toLowerCase());
  });

  it("GET reports connection for known wallet", async () => {
    const req = new NextRequest(
      `http://localhost/api/wallet/connect?address=${testAddress}`
    );
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.connected).toBe(true);
    expect(body.userId).toBeDefined();
  });

  it("rejects invalid address", async () => {
    const req = new NextRequest("http://localhost/api/wallet/connect", {
      method: "POST",
      body: JSON.stringify({ address: "bad" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
