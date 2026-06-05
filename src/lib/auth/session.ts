import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { verifyMessage } from "viem";
import { isValidAddress } from "@/lib/wallet/utils";
import { requireWalletSessionSecret } from "@/lib/production";

const SESSION_HEADER = "x-wallet-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export class SessionSecretError extends Error {
  constructor() {
    super("WALLET_SESSION_SECRET is required in production");
    this.name = "SessionSecretError";
  }
}

function getSecret(): string {
  const secret = process.env.WALLET_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (requireWalletSessionSecret()) {
    throw new SessionSecretError();
  }
  if (process.env.NODE_ENV === "test") {
    return "thesisx-test-session-secret";
  }
  return process.env.SOSOVALUE_API_KEY ?? "thesisx-dev-session-secret";
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function buildAuthMessage(address: string, nonce: string): string {
  const ts = new Date().toISOString();
  return `ThesisX wallet authentication\nAddress: ${address.toLowerCase()}\nNonce: ${nonce}\nIssued: ${ts}`;
}

export function createNonce(): string {
  return randomBytes(16).toString("hex");
}

export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: `0x${string}`
): Promise<boolean> {
  if (!isValidAddress(address)) return false;
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature,
    });
    return valid;
  } catch {
    return false;
  }
}

export function issueSessionToken(address: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${address.toLowerCase()}:${exp}`;
  const sig = signPayload(payload);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifySessionToken(
  token: string | null | undefined
): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [address, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!address || !Number.isFinite(exp) || Date.now() > exp) return null;
    const expected = signPayload(`${address}:${exp}`);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (!isValidAddress(address)) return null;
    return address.toLowerCase();
  } catch {
    return null;
  }
}

export { SESSION_HEADER };

export function isStrictWalletAuth(): boolean {
  return (
    process.env.BUILDATHON_MODE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true")
  );
}
