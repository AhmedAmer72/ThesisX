import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/observability";
import { getSodexReadiness } from "@/lib/sodex/readiness";
import {
  fetchAccountState,
  generateSodexApiKey,
  listRegisteredApiKeys,
} from "@/lib/sodex/setup";

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/sodex/setup");
  const readiness = getSodexReadiness();
  const userAddress =
    req.nextUrl.searchParams.get("address")?.trim() ||
    process.env.SODEX_USER_ADDRESS?.trim() ||
    "";

  let accountId: number | null = null;
  let apiKeys: string[] = [];
  let keyRegistered = false;

  if (userAddress) {
    const account = await fetchAccountState(userAddress, readiness.spotBase);
    accountId = account.aid;
    const keys = await listRegisteredApiKeys(
      userAddress,
      readiness.spotBase,
      process.env.SODEX_API_KEY_NAME
    );
    apiKeys = keys.keys;
    keyRegistered = keys.registered;
  }

  return NextResponse.json({
    ...readiness,
    userAddress: userAddress || null,
    accountId,
    apiKeys,
    keyRegistered,
    setupSteps: [
      "Connect master wallet on ValueChain testnet",
      "POST /api/sodex/setup with action=generate to create API key pair",
      "Register public key via SoDEX addAPIKey (master wallet signs)",
      "Set SODEX_API_KEY_NAME, SODEX_API_PRIVATE_KEY, SODEX_ACCOUNT_ID, SODEX_USER_ADDRESS in Vercel",
      "Run Test SoDEX connection in Settings",
    ],
    docsUrl: "https://sodex.com/documentation/api/api",
    requestId: reqId,
  });
}

export async function POST(req: NextRequest) {
  const reqId = logRequest("POST /api/sodex/setup");
  let body: { action?: string; keyName?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.action === "generate") {
    const generated = generateSodexApiKey(body.keyName ?? "thesisx-api-01");
    return NextResponse.json({
      generated: {
        keyName: generated.keyName,
        publicAddress: generated.publicAddress,
        privateKey: generated.privateKey,
        addApiKeyPayload: generated.addApiKeyPayload,
        registrationNote: generated.registrationNote,
        envExample: {
          SODEX_API_KEY_NAME: generated.keyName,
          SODEX_API_PRIVATE_KEY: generated.privateKey,
          SODEX_USER_ADDRESS: "<your-master-wallet>",
          SODEX_ACCOUNT_ID: "<from-accounts-state-aid>",
        },
      },
      warning:
        "Store the private key securely. Register the public key on SoDEX before trading.",
      requestId: reqId,
    });
  }

  return NextResponse.json(
    { error: "Unsupported action", requestId: reqId },
    { status: 400 }
  );
}
