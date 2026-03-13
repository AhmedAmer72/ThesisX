import { keccak256, toBytes } from "viem";

export type AddApiKeyParams = {
  accountID: number;
  name: string;
  /** APIKeyTypeEnum.EVM = 1 */
  type: 1;
  publicKey: `0x${string}`;
  expiresAt: number;
};

/** Testnet gateway — addAPIKey is not available on sodex.com/apikeys (mainnet UI). */
export const SODEX_TESTNET_SPOT_BASE =
  process.env.NEXT_PUBLIC_SODEX_SPOT_BASE ??
  "https://testnet-gw.sodex.dev/api/v1/spot";

export const SODEX_TESTNET_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_SODEX_CHAIN_ID ?? "138565"
);

/** EIP-712 universal domain for addAPIKey (signature prefix 0x02). */
export const SODEX_UNIVERSAL_EIP712_DOMAIN = {
  name: "universal",
  version: "1",
  chainId: SODEX_TESTNET_CHAIN_ID,
  verifyingContract:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

export const SODEX_EXCHANGE_ACTION_TYPES = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

export function buildAddApiKeyPayloadHash(params: AddApiKeyParams): `0x${string}` {
  const envelope = {
    type: "addAPIKey",
    params: {
      accountID: params.accountID,
      name: params.name,
      type: params.type,
      publicKey: params.publicKey,
      expiresAt: params.expiresAt,
    },
  };
  return keccak256(toBytes(JSON.stringify(envelope)));
}

function normalizeEcdsaSignature(signature: `0x${string}`): `0x${string}` {
  const hex = signature.slice(2);
  const bytes = Buffer.from(hex, "hex");
  if (bytes.length === 65 && bytes[64] >= 27) {
    bytes[64] -= 27;
  }
  return `0x${bytes.toString("hex")}` as `0x${string}`;
}

export function formatUniversalSignature(signature: `0x${string}`): `0x${string}` {
  return `0x02${normalizeEcdsaSignature(signature).slice(2)}` as `0x${string}`;
}

export async function submitAddApiKey(
  params: AddApiKeyParams,
  signature: `0x${string}`,
  nonce: string,
  spotBase = SODEX_TESTNET_SPOT_BASE
): Promise<{ ok: boolean; status: number; body: unknown; raw: string }> {
  const res = await fetch(`${spotBase}/accounts/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Sign": signature,
      "X-API-Nonce": nonce,
      "X-API-Chain": String(SODEX_TESTNET_CHAIN_ID),
    },
    body: JSON.stringify(params),
  });
  const raw = await res.text();
  let body: unknown = raw;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    // keep raw text
  }
  return { ok: res.ok, status: res.status, body, raw };
}
