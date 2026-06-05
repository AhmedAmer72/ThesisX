import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/infra/redis";

const memoryStore = new Map<string, { nonce: string; createdAt: number }>();
const NONCE_TTL_MS = 10 * 60 * 1000;

export async function storeNonce(address: string, nonce: string): Promise<void> {
  const key = address.toLowerCase();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  memoryStore.set(key, { nonce, createdAt: Date.now() });
  try {
    await prisma.authNonce.create({
      data: { address: key, nonce, expiresAt },
    });
  } catch {
    /* db optional during bootstrap */
  }
  try {
    const redis = getRedis();
    await redis.set(`nonce:${key}`, nonce, Math.floor(NONCE_TTL_MS / 1000));
  } catch {
    /* redis optional */
  }
}

export async function consumeNonce(
  address: string,
  nonce: string
): Promise<boolean> {
  const key = address.toLowerCase();

  const mem = memoryStore.get(key);
  if (mem?.nonce === nonce && Date.now() - mem.createdAt <= NONCE_TTL_MS) {
    memoryStore.delete(key);
    return true;
  }

  try {
    const redis = getRedis();
    const cached = await redis.get(`nonce:${key}`);
    if (cached === nonce) {
      await redis.del(`nonce:${key}`);
      return true;
    }
  } catch {
    /* continue to db */
  }

  try {
    const row = await prisma.authNonce.findFirst({
      where: {
        address: key,
        nonce,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) return false;
    await prisma.authNonce.delete({ where: { id: row.id } });
    return true;
  } catch {
    return false;
  }
}
