#!/usr/bin/env node
/**
 * Register a locally-generated API key on SoDEX testnet via addAPIKey.
 * Requires MASTER wallet private key (not the API key private key).
 *
 * Usage:
 *   SODEX_MASTER_PRIVATE_KEY=0x... node scripts/register-sodex-api-key.mjs thesisx-api-01 0xPublicAddress [expiresAtMs]
 */
import { createWalletClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const keyName = process.argv[2] ?? "thesisx-api-01";
const publicKey = process.argv[3];
const expiresAt = Number(
  process.argv[4] ?? Date.now() + 365 * 24 * 60 * 60 * 1000
);
const masterKey = process.env.SODEX_MASTER_PRIVATE_KEY?.trim();
const spotBase =
  process.env.SODEX_SPOT_BASE ??
  "https://testnet-gw.sodex.dev/api/v1/spot";
const chainId = Number(process.env.SODEX_CHAIN_ID ?? "138565");

if (!masterKey?.startsWith("0x")) {
  console.error("Set SODEX_MASTER_PRIVATE_KEY=0x<master-wallet-private-key>");
  process.exit(1);
}
if (!publicKey?.startsWith("0x")) {
  console.error(
    "Usage: node scripts/register-sodex-api-key.mjs <keyName> <publicAddress> [expiresAtMs]"
  );
  process.exit(1);
}

const accountId = Number(process.env.SODEX_ACCOUNT_ID ?? "0");
if (!accountId) {
  console.error("Set SODEX_ACCOUNT_ID (e.g. 58485) from account /state aid");
  process.exit(1);
}

const params = {
  accountID: accountId,
  name: keyName,
  type: 1,
  publicKey,
  expiresAt,
};

function normalizeSignature(signature) {
  const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
  const bytes = Buffer.from(hex, "hex");
  if (bytes[64] >= 27) bytes[64] -= 27;
  return `0x${bytes.toString("hex")}`;
}

const payloadHash = keccak256(
  toBytes(
    JSON.stringify({
      type: "addAPIKey",
      params,
    })
  )
);

const account = privateKeyToAccount(masterKey);
const client = createWalletClient({
  account,
  chain: {
    id: chainId,
    name: "ValueChain Testnet",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc-testnet.sodex.dev"] } },
  },
  transport: http(),
});

const nonce = String(Date.now());
const signature = await client.signTypedData({
  domain: {
    name: "universal",
    version: "1",
    chainId,
    verifyingContract: "0x0000000000000000000000000000000000000000",
  },
  types: {
    ExchangeAction: [
      { name: "payloadHash", type: "bytes32" },
      { name: "nonce", type: "uint64" },
    ],
  },
  primaryType: "ExchangeAction",
  message: {
    payloadHash,
    nonce: BigInt(nonce),
  },
});

const typedSig = `0x02${normalizeSignature(signature).slice(2)}`;
const res = await fetch(`${spotBase}/accounts/api-keys`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Sign": typedSig,
    "X-API-Nonce": nonce,
    "X-API-Chain": String(chainId),
  },
  body: JSON.stringify(params),
});

const text = await res.text();
console.log("POST", `${spotBase}/accounts/api-keys`);
console.log("Master wallet:", account.address);
console.log("Status:", res.status);
console.log(text);
