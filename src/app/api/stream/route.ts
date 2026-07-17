import { NextRequest } from "next/server";
import { subscribeLocal } from "@/lib/realtime/event-bus";
import { sosoClient } from "@/lib/soso/client";
import { isLiveIntelligenceRequired } from "@/lib/soso/fetch";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function sendFundOrderSnapshot(
  fundId: string,
  send: (data: unknown) => void
) {
  const orders = await prisma.executionOrder.findMany({
    where: { fundId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  send({
    type: "order_snapshot",
    channel: `fund:${fundId}`,
    payload: {
      orders: orders.map((o) => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side,
        quantity: o.quantity,
        status: o.status,
        mode: o.mode,
        externalRef: o.externalRef,
        nonce: o.nonce,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
    },
    ts: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") ?? "market-pulse";
  const encoder = new TextEncoder();
  const fundMatch = /^fund:(.+)$/.exec(channel);
  const fundId = fundMatch?.[1] ?? null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      send({ type: "connected", channel, ts: new Date().toISOString() });

      const unsubscribe = subscribeLocal(channel, (event) => send(event));

      if (channel === "market-pulse") {
        void sosoClient
          .buildIntelligencePacket({
            liveOnly: isLiveIntelligenceRequired(),
            useCache: true,
            modules: ["etf", "feeds", "index"],
          })
          .then((packet) => {
            send({
              type: "market_pulse",
              channel,
              payload: packet.marketPulse,
              fetchedAt: packet.fetchedAt,
              demoMode: packet.demoMode,
            });
          })
          .catch((e) => {
            send({
              type: "error",
              message: e instanceof Error ? e.message : "pulse_failed",
            });
          });
      }

      if (fundId) {
        void sendFundOrderSnapshot(fundId, send).catch(() => undefined);
      }

      const interval = setInterval(async () => {
        if (channel === "market-pulse") {
          try {
            const packet = await sosoClient.buildIntelligencePacket({
              liveOnly: isLiveIntelligenceRequired(),
              useCache: true,
              modules: ["etf", "feeds", "index"],
            });
            send({
              type: "market_pulse",
              channel,
              payload: packet.marketPulse,
              fetchedAt: packet.fetchedAt,
              demoMode: packet.demoMode,
            });
          } catch (e) {
            send({
              type: "error",
              message: e instanceof Error ? e.message : "pulse_failed",
            });
          }
        }
        if (fundId) {
          try {
            await sendFundOrderSnapshot(fundId, send);
          } catch {
            /* ignore */
          }
        }
      }, fundId ? 12_000 : 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
