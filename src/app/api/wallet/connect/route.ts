import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRequest } from "@/lib/observability";
import { isValidAddress } from "@/lib/wallet/utils";
import {
  issueSessionToken,
  verifyWalletSignature,
  isStrictWalletAuth,
} from "@/lib/auth/session";
import { consumeNonce } from "@/lib/auth/nonce-store";

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/wallet/connect");
  try {
    const body = await req.json();
    const raw = body.address as string;
    if (!raw || !isValidAddress(raw)) {
      return NextResponse.json(
        { error: "Valid Ethereum address required", requestId: reqId },
        { status: 400 }
      );
    }

    const walletAddress = raw.toLowerCase();
    const message = body.message as string | undefined;
    const signature = body.signature as `0x${string}` | undefined;
    const nonce = body.nonce as string | undefined;

    if (message && signature) {
      if (!nonce || !(await consumeNonce(walletAddress, nonce))) {
        return NextResponse.json(
          { error: "Invalid or expired nonce", requestId: reqId },
          { status: 401 }
        );
      }
      const valid = await verifyWalletSignature(walletAddress, message, signature);
      if (!valid) {
        return NextResponse.json(
          { error: "Signature verification failed", requestId: reqId },
          { status: 401 }
        );
      }
    }

    const existing = await prisma.user.findUnique({
      where: { walletAddress },
    });

    const user = existing
      ? await prisma.user.update({
          where: { walletAddress },
          data: { updatedAt: new Date() },
        })
      : await prisma.user.create({
          data: { walletAddress },
        });

    if ((!message || !signature) && isStrictWalletAuth()) {
      return NextResponse.json(
        {
          error: "Signed wallet authentication required",
          requestId: reqId,
        },
        { status: 401 }
      );
    }

    const sessionToken =
      message && signature ? issueSessionToken(walletAddress) : undefined;

    return NextResponse.json({
      userId: user.id,
      walletAddress: user.walletAddress,
      sessionToken,
      requestId: reqId,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Wallet connect failed",
        requestId: reqId,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/wallet/connect");
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: "address query required", requestId: reqId },
      { status: 400 }
    );
  }
  const user = await prisma.user.findUnique({ where: { walletAddress: address } });
  return NextResponse.json({
    connected: Boolean(user),
    userId: user?.id,
    walletAddress: user?.walletAddress,
    requestId: reqId,
  });
}
