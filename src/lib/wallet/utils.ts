import type { Address } from "viem";
import { setStoredSession } from "@/lib/wallet/session";

export function isValidAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export async function persistWalletConnection(
  address: string,
  signMessageAsync?: (args: { message: string }) => Promise<`0x${string}`>
) {
  let body: Record<string, string> = { address };

  if (signMessageAsync) {
    const nonceRes = await fetch(`/api/wallet/nonce?address=${address}`);
    const nonceData = await nonceRes.json();
    if (!nonceRes.ok) {
      throw new Error(nonceData.error ?? "Failed to get auth nonce");
    }
    const signature = await signMessageAsync({ message: nonceData.message });
    body = {
      address,
      message: nonceData.message,
      signature,
      nonce: nonceData.nonce,
    };
  }

  const res = await fetch("/api/wallet/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Failed to save wallet session"
    );
  }
  const data = await res.json();
  if (data.sessionToken) {
    setStoredSession(data.sessionToken);
  }
  return data;
}
