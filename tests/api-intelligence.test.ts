import { describe, expect, it, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getIntelligence } from "@/app/api/intelligence/route";
import { GET as getHealth } from "@/app/api/intelligence/health/route";

describe("intelligence API", () => {
  const originalKey = process.env.SOSOVALUE_API_KEY;

  afterEach(() => {
    process.env.SOSOVALUE_API_KEY = originalKey;
  });

  it("returns 503 for live=true without API key", async () => {
    delete process.env.SOSOVALUE_API_KEY;
    const req = new NextRequest("http://localhost/api/intelligence?live=true");
    const res = await getIntelligence(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("missing_api_key");
  });

  it("returns health payload", async () => {
    const req = new NextRequest("http://localhost/api/intelligence/health?live=false");
    const res = await getHealth(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.configured).toBe("boolean");
    expect(Array.isArray(body.modules)).toBe(true);
  });
});
