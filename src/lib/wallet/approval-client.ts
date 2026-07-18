import { buildApprovalMessage, type ApprovalAction } from "@/lib/auth/approval";

export async function signExecutionApproval(
  address: string,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>,
  params: {
    action: ApprovalAction;
    slug: string;
    intentId: string;
  }
): Promise<{
  approvalMessage: string;
  approvalSignature: `0x${string}`;
  approvalTimestamp: number;
}> {
  const approvalTimestamp = Date.now();
  const approvalMessage = buildApprovalMessage({
    address,
    action: params.action,
    slug: params.slug,
    intentId: params.intentId,
    timestamp: approvalTimestamp,
  });
  const approvalSignature = await signMessageAsync({ message: approvalMessage });
  return { approvalMessage, approvalSignature, approvalTimestamp };
}
