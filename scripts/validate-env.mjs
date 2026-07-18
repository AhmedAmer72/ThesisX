import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
} catch {
  /* no .env */
}

const requiredProd = ["SOSOVALUE_API_KEY", "WALLET_SESSION_SECRET"];

if (process.env.OPENAI_REQUIRED === "true") {
  requiredProd.push("OPENAI_API_KEY");
}

if (process.env.BUILDATHON_MODE === "true") {
  requiredProd.push(
    "SODEX_API_KEY_NAME",
    "SODEX_API_PRIVATE_KEY",
    "SODEX_ACCOUNT_ID",
    "SODEX_USER_ADDRESS"
  );
}

const isProd =
  process.env.NODE_ENV === "production" ||
  process.env.PRODUCTION_MODE === "true" ||
  process.env.BUILDATHON_MODE === "true";

const missing = requiredProd.filter((k) => !process.env[k]?.trim());

if (isProd && missing.length) {
  console.error("Missing required production env vars:");
  for (const k of missing) console.error(`  - ${k}`);
  process.exit(1);
}

if (process.env.EXECUTION_MODE === "mock" && isProd) {
  console.error("EXECUTION_MODE=mock is not allowed in production");
  process.exit(1);
}

if (process.env.BUILDATHON_MODE === "true" && process.env.DEMO_MODE === "true") {
  console.error("DEMO_MODE=true is not allowed when BUILDATHON_MODE=true");
  process.exit(1);
}

const accountId = process.env.SODEX_ACCOUNT_ID?.trim();
if (
  process.env.BUILDATHON_MODE === "true" &&
  (accountId == null || accountId === "")
) {
  console.error("SODEX_ACCOUNT_ID is required in buildathon mode (often 0)");
  process.exit(1);
}

console.log("Environment validation passed");
