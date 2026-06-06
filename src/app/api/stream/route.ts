import { NextRequest } from "next/server";
import { subscribeLocal } from "@/lib/realtime/event-bus";
import { sosoClient } from "@/lib/soso/client";
import { isLiveIntelligenceRequired } from "@/lib/soso/fetch";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") ?? "market-pulse";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      send({ type: "connected", channel, ts: new Date().toISOString() });

      const unsubscribe = subscribeLocal(channel, (event) => send(event));

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
      }, 30_000);

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
