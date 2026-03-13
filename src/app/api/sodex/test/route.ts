import { NextResponse } from "next/server";
import { getSodexReadiness } from "@/lib/sodex/readiness";
import {
  fetchAccountState,
  listRegisteredApiKeys,
  resolveSodexAccountId,
} from "@/lib/sodex/setup";
import { logRequest } from "@/lib/observability";

export async function GET() {
  const reqId = logRequest("GET /api/sodex/test");
  const readiness = getSodexReadiness();
  const userAddress = process.env.SODEX_USER_ADDRESS?.trim();

  let accountResolved: number | null = null;
  let apiKeys: string[] = [];
  let keyRegistered = false;
  let accountRaw: string | undefined;

  if (userAddress && readiness.spotBase) {
    const account = await fetchAccountState(userAddress, readiness.spotBase);
    accountResolved = account.aid;
    accountRaw = account.raw;
    accountResolved =
      accountResolved ??
      (await resolveSodexAccountId(userAddress, readiness.spotBase));
    const keys = await listRegisteredApiKeys(
      userAddress,
      readiness.spotBase,
      process.env.SODEX_API_KEY_NAME
    );
    apiKeys = keys.keys;
    keyRegistered = keys.registered;
    if (readiness.hasApiKey && !keyRegistered) {
      readiness.blockers.push(
        `API key "${process.env.SODEX_API_KEY_NAME}" not registered for ${userAddress}`
      );
      readiness.ready = false;
    }
  }

  return NextResponse.json({
    ...readiness,
    accountResolved,
    apiKeys,
    keyRegistered,
    userAddressConfigured: Boolean(userAddress),
    accountRaw,
    requestId: reqId,
  });
}
