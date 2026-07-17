import { hasSosoApiKey } from "@/lib/soso/fetch";
import {
  getExecutionMode,
  isBuildathonMode,
  isMockExecutionAllowed,
} from "@/lib/buildathon";
import { prisma } from "@/lib/db";
import { isGlobalKillSwitchActive } from "@/lib/settings";
import { getSodexReadiness } from "@/lib/sodex/readiness";
import { isAiRequired } from "@/lib/production";

export type ReadinessState = {
  buildathonMode: boolean;
  ready: boolean;
  database: boolean;
  sosoLive: boolean;
  sodexTestnet: boolean;
  openai: boolean;
  openaiRequired: boolean;
  killSwitch: boolean;
  executionMode: string;
  demoMode: boolean;
  walletConnectConfigured: boolean;
  blockers: string[];
  warnings: string[];
};

export async function getReadinessState(): Promise<ReadinessState> {
  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const killSwitch = await isGlobalKillSwitchActive();
  const sodex = getSodexReadiness();
  const sosoLive = hasSosoApiKey();
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const openaiRequired = isAiRequired();
  const executionMode = getExecutionMode();
  const demoMode = process.env.DEMO_MODE === "true" && !isBuildathonMode();
  const walletConnectConfigured = Boolean(
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() &&
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID !== "00000000000000000000000000000000"
  );

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!database) blockers.push("Database unavailable");
  if (!sosoLive) blockers.push("SoSoValue API key missing");
  if (openaiRequired && !openai) {
    blockers.push("OpenAI API key missing (OPENAI_REQUIRED=true)");
  } else if (!openai) {
    warnings.push(
      "OpenAI enhancement unavailable — funds use live SoSo deterministic committee"
    );
  }
  if (isBuildathonMode() && !sodex.ready) {
    blockers.push(...sodex.blockers);
  }
  if (isBuildathonMode() && isMockExecutionAllowed()) {
    blockers.push("Mock execution is disabled in buildathon mode");
  }
  if (!isBuildathonMode() && !sodex.ready) {
    warnings.push(
      "SoDEX credentials incomplete — fund creation works; approval/execution may be blocked"
    );
  }
  if (killSwitch) blockers.push("Global kill switch is active");

  const ready =
    database &&
    sosoLive &&
    blockers.filter((b) => b !== "Global kill switch is active").length === 0 &&
    (!isBuildathonMode() || sodex.ready);

  return {
    buildathonMode: isBuildathonMode(),
    ready,
    database,
    sosoLive,
    sodexTestnet: sodex.ready,
    openai,
    openaiRequired,
    killSwitch,
    executionMode,
    demoMode,
    walletConnectConfigured,
    blockers,
    warnings,
  };
}
