/**
 * Verify SoDEX testnet readiness (account state, API keys, symbol map).
 * Run: npm run verify:sodex
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
try {
  const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch (e) {
  console.error("Failed to read .env:", e instanceof Error ? e.message : e);
}

const userAddress = process.env.SODEX_USER_ADDRESS?.trim();
const keyName = process.env.SODEX_API_KEY_NAME?.trim();
const accountId = process.env.SODEX_ACCOUNT_ID?.trim();
const spotBase =
  process.env.SODEX_SPOT_BASE ?? "https://testnet-gw.sodex.dev/api/v1/spot";

const checks = [];

function fail(msg) {
  checks.push({ ok: false, label: msg });
}

function pass(label, detail = "") {
  checks.push({ ok: true, label, detail });
}

if (!userAddress) fail("SODEX_USER_ADDRESS missing");
else pass("SODEX_USER_ADDRESS set", userAddress);

if (!keyName) fail("SODEX_API_KEY_NAME missing");
else pass("SODEX_API_KEY_NAME set", keyName);

if (!process.env.SODEX_API_PRIVATE_KEY?.trim()) {
  fail("SODEX_API_PRIVATE_KEY missing");
} else {
  pass("SODEX_API_PRIVATE_KEY set");
}

if (accountId == null || accountId === "") {
  fail("SODEX_ACCOUNT_ID missing (primary account is often 0)");
} else {
  pass("SODEX_ACCOUNT_ID set", accountId);
}

if (userAddress) {
  try {
    const res = await fetch(`${spotBase}/accounts/${userAddress}/state`, {
      headers: { Accept: "application/json" },
    });
    const json = await res.json();
    const aid = json.aid ?? json.data?.aid;
    if (res.ok && aid != null) {
      pass("Account state reachable", `aid=${aid}`);
      if (accountId != null && String(aid) !== accountId) {
        fail(`SODEX_ACCOUNT_ID mismatch: env=${accountId} api=${aid}`);
      }
    } else {
      fail(`Account state failed HTTP ${res.status}`);
    }
  } catch (e) {
    fail(`Account state error: ${e instanceof Error ? e.message : "unknown"}`);
  }

  try {
    const res = await fetch(`${spotBase}/accounts/${userAddress}/api-keys`, {
      headers: { Accept: "application/json" },
    });
    const json = await res.json();
    const keys = (json.data ?? []).map((k) => k.name).filter(Boolean);
    if (res.ok) {
      pass("API keys listed", keys.join(", ") || "none");
      if (keyName && !keys.includes(keyName)) {
        fail(
          `API key "${keyName}" not registered — register via addAPIKey on testnet`
        );
      } else if (keyName) {
        pass(`API key "${keyName}" registered`);
      }
    } else {
      fail(`API keys list failed HTTP ${res.status}`);
    }
  } catch (e) {
    fail(`API keys error: ${e instanceof Error ? e.message : "unknown"}`);
  }

  try {
    const res = await fetch(`${spotBase}/accounts/${userAddress}/balances`, {
      headers: { Accept: "application/json" },
    });
    const json = await res.json();
    if (res.ok && json.code === 0) {
      const balances = json.data?.balances ?? [];
      pass("Balances reachable", `${balances.length} coin(s)`);
    } else {
      fail(`Balances failed HTTP ${res.status}`);
    }
  } catch (e) {
    fail(`Balances error: ${e instanceof Error ? e.message : "unknown"}`);
  }
}

const symbols = ["BTC", "ETH", "SOL", "RNDR", "TAO"];
for (const sym of symbols) {
  const fromEnv = process.env[`SODEX_SYMBOL_${sym}`];
  if (fromEnv) pass(`Symbol ${sym}`, `id=${fromEnv}`);
  else pass(`Symbol ${sym}`, "default map");
}

console.log("\nSoDEX testnet verification:\n");
for (const c of checks) {
  console.log(c.ok ? "OK  " : "FAIL", c.label, c.detail ? `— ${c.detail}` : "");
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
