import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/funds/route";

describe("POST /api/funds validation", () => {
  it("rejects short prompts", async () => {
    const req = new NextRequest("http://localhost/api/funds", {
      method: "POST",
      body: JSON.stringify({ prompt: "short" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/10 characters/);
  });
});
