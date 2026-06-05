import { NextRequest } from "next/server";
import { getWalletFromRequest } from "@/lib/auth/wallet";

const ADMIN_WALLETS = (process.env.ADMIN_WALLET_ADDRESSES ?? "")
  .split(",")
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);

export function isAdminWallet(wallet: string | null): boolean {
  if (!wallet) return false;
  if (ADMIN_WALLETS.length === 0) {
    return process.env.NODE_ENV !== "production";
  }
  return ADMIN_WALLETS.includes(wallet.toLowerCase());
}

export function requireAdmin(req: NextRequest): { ok: true; wallet: string } | { ok: false; error: string } {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return { ok: false, error: "Authenticated wallet session required" };
  }
  if (!isAdminWallet(wallet)) {
    return { ok: false, error: "Admin access required" };
  }
  return { ok: true, wallet };
}

export function requireCronOrAdmin(
  req: NextRequest
): { ok: true } | { ok: false; error: string; status: number } {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return { ok: true };
  }
  const admin = requireAdmin(req);
  if (admin.ok) return { ok: true };
  return { ok: false, error: admin.error, status: 403 };
}
