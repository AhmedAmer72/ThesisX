import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getAccountId } from "@/lib/sodex/client";

export type GeneratedApiKey = {
  keyName: string;
  privateKey: `0x${string}`;
  publicAddress: `0x${string}`;
  addApiKeyPayload: {
    accountID: number;
    name: string;
    type: 1;
    publicKey: string;
    expiresAt: number;
  };
  registrationNote: string;
};

export function generateSodexApiKey(keyName = "thesisx-api-01"): GeneratedApiKey {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;

  return {
    keyName,
    privateKey,
    publicAddress: account.address,
    addApiKeyPayload: {
      accountID: 0,
      name: keyName,
      type: 1,
      publicKey: account.address,
      expiresAt,
    },
    registrationNote:
      "Register this key on SoDEX with addAPIKey signed by your master wallet. See https://sodex.com/documentation/api/api",
  };
}

export async function fetchAccountState(
  userAddress: string,
  spotBase: string
): Promise<{ aid: number | null; raw?: string }> {
  try {
    const res = await fetch(`${spotBase}/accounts/${userAddress}/state`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return { aid: null, raw: text };
    const data = JSON.parse(text) as { aid?: number; data?: { aid?: number } };
    return { aid: data.aid ?? data.data?.aid ?? null, raw: text };
  } catch (e) {
    return {
      aid: null,
      raw: e instanceof Error ? e.message : "account_state_failed",
    };
  }
}

export async function listRegisteredApiKeys(
  userAddress: string,
  spotBase: string,
  keyName?: string
): Promise<{ registered: boolean; keys: string[]; raw?: string }> {
  try {
    const url = new URL(`${spotBase}/accounts/${userAddress}/api-keys`);
    if (keyName) url.searchParams.set("name", keyName);
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return { registered: false, keys: [], raw: text };
    const json = JSON.parse(text) as {
      data?: Array<{ name?: string }>;
    };
    const keys = (json.data ?? [])
      .map((k) => k.name)
      .filter((n): n is string => Boolean(n));
    return {
      registered: keyName ? keys.includes(keyName) : keys.length > 0,
      keys,
      raw: text,
    };
  } catch (e) {
    return {
      registered: false,
      keys: [],
      raw: e instanceof Error ? e.message : "api_keys_failed",
    };
  }
}

export async function resolveSodexAccountId(
  userAddress: string,
  spotBase: string
): Promise<number | null> {
  const envId = process.env.SODEX_ACCOUNT_ID?.trim();
  if (envId) return Number(envId);
  return getAccountId(userAddress, spotBase);
}
