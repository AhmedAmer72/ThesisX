import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/infra/redis";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export async function getCachedModule<T>(
  module: string,
  key: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<{ data: T; fetchedAt: string; cacheHit: true } | null> {
  const redisKey = `soso:${module}:${key}`;
  try {
    const redis = getRedis();
    const cached = await redis.get(redisKey);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        data: T;
        fetchedAt: string;
      };
      return { data: parsed.data, fetchedAt: parsed.fetchedAt, cacheHit: true };
    }
  } catch {
    /* fallback to db */
  }

  const row = await prisma.intelligenceCache.findUnique({
    where: { module_key: { module, key } },
  });
  if (!row) return null;
  const age = Date.now() - row.fetchedAt.getTime();
  if (age > ttlMs) return null;
  try {
    return {
      data: JSON.parse(row.payload) as T,
      fetchedAt: row.fetchedAt.toISOString(),
      cacheHit: true,
    };
  } catch {
    return null;
  }
}

export async function setCachedModule(
  module: string,
  key: string,
  data: unknown
): Promise<string> {
  const fetchedAt = new Date();
  await prisma.intelligenceCache.upsert({
    where: { module_key: { module, key } },
    create: {
      module,
      key,
      payload: JSON.stringify(data),
      fetchedAt,
    },
    update: {
      payload: JSON.stringify(data),
      fetchedAt,
    },
  });
  try {
    const redis = getRedis();
    await redis.set(
      `soso:${module}:${key}`,
      JSON.stringify({ data, fetchedAt: fetchedAt.toISOString() }),
      Math.max(60, Math.floor(DEFAULT_TTL_MS / 1000))
    );
  } catch {
    /* optional */
  }
  return fetchedAt.toISOString();
}

export async function listCacheFreshness(): Promise<
  { module: string; key: string; fetchedAt: string; ageMs: number }[]
> {
  const rows = await prisma.intelligenceCache.findMany({
    orderBy: { fetchedAt: "desc" },
    take: 50,
  });
  const now = Date.now();
  return rows.map((r) => ({
    module: r.module,
    key: r.key,
    fetchedAt: r.fetchedAt.toISOString(),
    ageMs: now - r.fetchedAt.getTime(),
  }));
}
