import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isValidAddress } from "@/lib/wallet/utils";
import {
  isStrictWalletAuth,
  SESSION_HEADER,
  verifySessionToken,
} from "@/lib/auth/session";

export const WALLET_HEADER = "x-wallet-address";

export function getWalletFromRequest(req: NextRequest): string | null {
  const session = verifySessionToken(req.headers.get(SESSION_HEADER));
  if (session) return session;

  const raw =
    req.headers.get(WALLET_HEADER) ??
    req.nextUrl.searchParams.get("wallet") ??
    null;
  if (!raw || !isValidAddress(raw)) return null;

  if (isStrictWalletAuth()) {
    return null;
  }
  return raw.toLowerCase();
}

export async function resolveUserFromWallet(wallet: string) {
  return prisma.user.findUnique({
    where: { walletAddress: wallet.toLowerCase() },
  });
}

export async function requireFundOwner(
  fundId: string,
  wallet: string | null
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!wallet) {
    return {
      ok: false,
      error: isStrictWalletAuth()
        ? "Authenticated wallet session required"
        : "Wallet address required (x-wallet-address header)",
    };
  }
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: { userId: true },
  });
  if (!fund) return { ok: false, error: "Fund not found" };
  if (!fund.userId) {
    return {
      ok: false,
      error: "Fund has no owner — connect wallet before creating funds",
    };
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user || user.id !== fund.userId) {
    return { ok: false, error: "Not authorized — wallet does not own this fund" };
  }
  return { ok: true, userId: user.id };
}

export async function requireFundOwnerBySlug(
  slug: string,
  wallet: string | null
): Promise<
  | { ok: true; userId: string; fundId: string }
  | { ok: false; error: string }
> {
  const fund = await prisma.fund.findUnique({
    where: { slug },
    select: { id: true, userId: true },
  });
  if (!fund) return { ok: false, error: "Fund not found" };
  const auth = await requireFundOwner(fund.id, wallet);
  if (!auth.ok) return auth;
  return { ok: true, userId: auth.userId, fundId: fund.id };
}

export async function requireWalletUser(
  wallet: string | null
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!wallet) {
    return {
      ok: false,
      error: isStrictWalletAuth()
        ? "Authenticated wallet session required"
        : "Wallet required",
    };
  }
  const user = await resolveUserFromWallet(wallet);
  if (!user) {
    return { ok: false, error: "Wallet not registered — connect wallet first" };
  }
  return { ok: true, userId: user.id };
}
