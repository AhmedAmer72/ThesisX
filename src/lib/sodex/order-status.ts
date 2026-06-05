import { getExecutionMode } from "@/lib/buildathon";

export type SodexOrderStatus = {
  orderId?: string;
  status: string;
  filledQty?: string;
  raw?: string;
};

export async function fetchOrderStatus(
  externalRef: string | null | undefined
): Promise<SodexOrderStatus | null> {
  if (!externalRef) return null;
  const mode = getExecutionMode();
  if (mode === "mock") return null;

  const spotBase =
    process.env.SODEX_SPOT_BASE ??
    "https://testnet-gw.sodex.dev/api/v1/spot";
  const keyName = process.env.SODEX_API_KEY_NAME;
  if (!keyName) return null;

  try {
    const res = await fetch(`${spotBase}/trade/orders/${externalRef}`, {
      headers: {
        Accept: "application/json",
        "X-API-Key": keyName,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return { status: res.ok ? "unknown" : `http_${res.status}`, raw: await res.text() };
    }
    const json = (await res.json()) as {
      orderID?: string;
      status?: string;
      filledQty?: string;
    };
    return {
      orderId: json.orderID ?? externalRef,
      status: json.status ?? "submitted",
      filledQty: json.filledQty,
    };
  } catch (e) {
    return {
      status: "poll_error",
      raw: e instanceof Error ? e.message : "poll_failed",
    };
  }
}

export function mapRemoteStatusToLocal(remote: string): string {
  const s = remote.toLowerCase();
  if (s.includes("fill") || s === "filled" || s === "done") return "filled";
  if (s.includes("cancel") || s.includes("reject") || s.includes("fail")) {
    return "failed";
  }
  if (s.includes("submit") || s.includes("open") || s.includes("new")) {
    return "submitted";
  }
  return remote;
}
