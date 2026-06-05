import { getRedis } from "@/lib/infra/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  const bucket = `rl:${key}`;
  const count = await redis.incr(bucket);
  if (count === 1) {
    await redis.expire(bucket, windowSeconds);
  }
  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    resetAt: Date.now() + windowSeconds * 1000,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
