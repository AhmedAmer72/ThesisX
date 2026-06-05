/**
 * SoDEX WebSocket client — market/account stream bridge.
 * Docs: wss://testnet-gw.sodex.dev/ws/spot
 */

export type SodexWsChannel = "ticker" | "account" | "orders";

export function getSodexWsBase(mode: "testnet" | "mainnet" = "testnet"): string {
  return mode === "testnet"
    ? "wss://testnet-gw.sodex.dev/ws/spot"
    : "wss://mainnet-gw.sodex.dev/ws/spot";
}

export type SodexWsMessage = {
  channel: string;
  data: unknown;
  receivedAt: string;
};

export class SodexWsClient {
  private ws: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly onMessage: (msg: SodexWsMessage) => void
  ) {}

  connect(subscribe: Record<string, unknown>): void {
    if (typeof WebSocket === "undefined") return;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ op: "subscribe", ...subscribe }));
    };
    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as unknown;
        this.onMessage({
          channel: "spot",
          data,
          receivedAt: new Date().toISOString(),
        });
      } catch {
        /* ignore malformed */
      }
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
