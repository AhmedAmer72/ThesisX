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

console.log("Environment validation passed");
