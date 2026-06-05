import { prisma } from "@/lib/db";

const SIGNER_KEY = "default-api-signer";

export async function nextExecutionNonce(): Promise<string> {
  const row = await prisma.executionNonce.upsert({
    where: { signerKey: SIGNER_KEY },
    create: { signerKey: SIGNER_KEY, lastNonce: BigInt(1) },
    update: { lastNonce: { increment: 1 } },
  });
  return row.lastNonce.toString();
}

export async function peekExecutionNonce(): Promise<string> {
  const row = await prisma.executionNonce.findUnique({
    where: { signerKey: SIGNER_KEY },
  });
  return row ? row.lastNonce.toString() : "0";
}
