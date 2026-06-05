import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_LIMITED_PREFIXES = [
  "/api/intelligence",
  "/api/funds",
  "/api/audit",
  "/api/sodex",
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  if (!isApi) return NextResponse.next();

  const needsLimit = RATE_LIMITED_PREFIXES.some((p) => path.startsWith(p));
  if (!needsLimit) return NextResponse.next();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const key = `mw:${ip}:${path.split("/").slice(0, 4).join("/")}`;
  const bucket = globalThis.__thesisxRateBuckets as
    | Map<string, { count: number; reset: number }>
    | undefined;
  const store = bucket ?? new Map();
  globalThis.__thesisxRateBuckets = store;

  const now = Date.now();
  const windowMs = 60_000;
  const limit = path.includes("/intelligence/health") ? 20 : 120;
  const entry = store.get(key);
  if (!entry || entry.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return NextResponse.next();
  }
  entry.count += 1;
  if (entry.count > limit) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: entry.reset - now },
      { status: 429 }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

declare global {
  // eslint-disable-next-line no-var
  var __thesisxRateBuckets: Map<string, { count: number; reset: number }> | undefined;
}
