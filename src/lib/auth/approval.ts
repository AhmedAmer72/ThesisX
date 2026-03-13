import { verifyMessage } from "viem";
import { isValidAddress } from "@/lib/wallet/utils";
import { isStrictWalletAuth } from "@/lib/auth/session";
import { getExecutionMode } from "@/lib/buildathon";

const APPROVAL_TTL_MS = 10 * 60 * 1000;

export type ApprovalAction = "fund_execute" | "rebalance_execute";

export function isApprovalSignatureRequired(): boolean {
  return isStrictWalletAuth() || getExecutionMode() === "testnet";
}

export function buildApprovalMessage(params: {
  address: string;
  action: ApprovalAction;
  slug: string;
  intentId: string;
  timestamp: number;
}): string {
  return [
    "ThesisX execution approval",
    `Action: ${params.action}`,
    `Address: ${params.address.toLowerCase()}`,
    `Fund: ${params.slug}`,
    `Intent: ${params.intentId}`,
    `Timestamp: ${params.timestamp}`,
    "I accept execution and market risks on testnet.",
  ].join("\n");
}

export async function verifyApprovalSignature(params: {
  address: string;
  action: ApprovalAction;
  slug: string;
  intentId: string;
  timestamp: number;
  signature: `0x${string}`;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidAddress(params.address)) {
    return { ok: false, error: "Invalid wallet address" };
  }
  if (!Number.isFinite(params.timestamp)) {
    return { ok: false, error: "Invalid approval timestamp" };
  }
  const age = Math.abs(Date.now() - params.timestamp);
  if (age > APPROVAL_TTL_MS) {
    return { ok: false, error: "Approval signature expired — sign again" };
  }
  const message = buildApprovalMessage(params);
  try {
    const valid = await verifyMessage({
      address: params.address as `0x${string}`,
      message,
      signature: params.signature,
    });
    if (!valid) return { ok: false, error: "Approval signature verification failed" };
    return { ok: true };
  } catch {
    return { ok: false, error: "Approval signature verification failed" };
  }
}
