import { WALLET_HEADER } from "@/lib/auth/wallet";
import { SESSION_HEADER } from "@/lib/auth/session";
import { getStoredSession } from "@/lib/wallet/session";

export function walletHeaders(address: string | null | undefined): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const session = getStoredSession();
  if (session) {
    headers[SESSION_HEADER] = session;
  } else if (address) {
    headers[WALLET_HEADER] = address.toLowerCase();
  }
  return headers;
}

export async function fetchWithWallet(
  url: string,
  address: string | null | undefined,
  init?: RequestInit
) {
  return fetch(url, {
    ...init,
    headers: {
      ...walletHeaders(address),
      ...(init?.headers ?? {}),
    },
  });
}
