/**
 * Redis client with in-memory fallback for local dev when REDIS_URL is unset.
 */

type CacheEntry = { value: string; expiresAt: number };

const memoryStore = new Map<string, CacheEntry>();

function pruneMemory() {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (v.expiresAt <= now) memoryStore.delete(k);
  }
}

export type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  publish?(channel: string, message: string): Promise<void>;
};

class MemoryRedis implements RedisLike {
  async get(key: string): Promise<string | null> {
    pruneMemory();
    const entry = memoryStore.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    memoryStore.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? "0");
    const next = current + 1;
    await this.set(key, String(next), 3600);
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const val = await this.get(key);
    if (val != null) await this.set(key, val, ttlSeconds);
  }

  async publish(): Promise<void> {
    /* no-op in memory mode */
  }
}

let client: RedisLike | null = null;

export function getRedis(): RedisLike {
  if (client) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    client = new MemoryRedis();
    return client;
  }
  // Dynamic import avoided — use fetch-based Upstash REST if URL looks like upstash
  if (url.startsWith("https://")) {
    client = createUpstashRestClient(url, process.env.REDIS_TOKEN ?? "");
    return client;
  }
  client = new MemoryRedis();
  return client;
}

function createUpstashRestClient(baseUrl: string, token: string): RedisLike {
  async function command<T>(cmd: unknown[]): Promise<T> {
    const res = await fetch(`${baseUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
    });
    const json = (await res.json()) as { result?: T };
    return json.result as T;
  }
  return {
    async get(key) {
      const r = await command<string | null>(["GET", key]);
      return r;
    },
    async set(key, value, ttlSeconds = 300) {
      if (ttlSeconds > 0) {
        await command(["SET", key, value, "EX", ttlSeconds]);
      } else {
        await command(["SET", key, value]);
      }
    },
    async del(key) {
      await command(["DEL", key]);
    },
    async incr(key) {
      return (await command<number>(["INCR", key])) ?? 1;
    },
    async expire(key, ttlSeconds) {
      await command(["EXPIRE", key, ttlSeconds]);
    },
    async publish(channel, message) {
      await command(["PUBLISH", channel, message]);
    },
  };
}

export function resetRedisForTests() {
  client = null;
  memoryStore.clear();
}
