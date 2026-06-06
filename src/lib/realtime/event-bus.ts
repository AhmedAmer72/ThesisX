import { getRedis } from "@/lib/infra/redis";

export type RealtimeEvent = {
  type: string;
  channel: string;
  payload: Record<string, unknown>;
  ts: string;
};

const localSubscribers = new Map<string, Set<(e: RealtimeEvent) => void>>();

export async function publishEvent(
  channel: string,
  type: string,
  payload: Record<string, unknown>
): Promise<RealtimeEvent> {
  const event: RealtimeEvent = {
    type,
    channel,
    payload,
    ts: new Date().toISOString(),
  };
  const subs = localSubscribers.get(channel);
  if (subs) {
    for (const fn of subs) fn(event);
  }
  try {
    const redis = getRedis();
    if (redis.publish) {
      await redis.publish(`rt:${channel}`, JSON.stringify(event));
    }
    await redis.set(
      `rt:last:${channel}`,
      JSON.stringify(event),
      300
    );
  } catch {
    /* optional */
  }
  return event;
}

export function subscribeLocal(
  channel: string,
  handler: (e: RealtimeEvent) => void
): () => void {
  const set = localSubscribers.get(channel) ?? new Set();
  set.add(handler);
  localSubscribers.set(channel, set);
  return () => set.delete(handler);
}

export async function getLastEvent(
  channel: string
): Promise<RealtimeEvent | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(`rt:last:${channel}`);
    if (!raw) return null;
    return JSON.parse(raw) as RealtimeEvent;
  } catch {
    return null;
  }
}
