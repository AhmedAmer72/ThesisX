import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns ok status and db flag", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.db).toBe("boolean");
    expect(body.requestId).toBeDefined();
  });
});
