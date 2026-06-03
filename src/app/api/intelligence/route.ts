import { NextRequest, NextResponse } from "next/server";
import { sosoClient } from "@/lib/soso/client";
import { logRequest } from "@/lib/observability";
import { isSosoSetupError, SosoLiveRequiredError } from "@/lib/soso/errors";
import type { SosoModuleId } from "@/lib/soso/modules";
import { hasSosoApiKey } from "@/lib/soso/fetch";

const VALID_MODULES: SosoModuleId[] = [
  "feeds",
  "etf",
  "index",
  "macro",
  "currency",
  "fundraising",
  "btc-treasuries",
  "crypto-stocks",
  "charts",
];

export async function GET(req: NextRequest) {
  const reqId = logRequest("GET /api/intelligence");
  const liveOnly = req.nextUrl.searchParams.get("live") === "true";
  const moduleParam = req.nextUrl.searchParams.get("module");

  if (!hasSosoApiKey() && liveOnly) {
    return NextResponse.json(
      {
        error: "SOSOVALUE_API_KEY is required for live intelligence.",
        code: "missing_api_key",
        setupUrl: "https://sosovalue-1.gitbook.io/sosovalue-api-doc",
        requestId: reqId,
      },
      { status: 503 }
    );
  }

  try {
    const modules = moduleParam
      ? (moduleParam
          .split(",")
          .map((m) => m.trim())
          .filter((m): m is SosoModuleId =>
            VALID_MODULES.includes(m as SosoModuleId)
          ) as SosoModuleId[])
      : undefined;

    const packet = await sosoClient.buildIntelligencePacket({
      liveOnly,
      modules,
      useCache: req.nextUrl.searchParams.get("refresh") !== "true",
    });

    return NextResponse.json({
      packet,
      configured: hasSosoApiKey(),
      requestId: reqId,
    });
  } catch (e) {
    if (isSosoSetupError(e)) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          requestId: reqId,
        },
        { status: 503 }
      );
    }
    if (e instanceof SosoLiveRequiredError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          moduleErrors: e.moduleErrors,
          requestId: reqId,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Intelligence fetch failed",
        requestId: reqId,
      },
      { status: 500 }
    );
  }
}
