/**
 * Verify live SoSoValue connectivity for all MVP modules.
 * Run: npm run verify:soso
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

const key = process.env.SOSOVALUE_API_KEY;
if (!key) {
  console.error("Missing SOSOVALUE_API_KEY in .env");
  process.exit(1);
}

const root =
  process.env.SOSOVALUE_BASE_URL?.replace(/\/openapi\/v1\/?$/, "") ??
  "https://openapi.sosovalue.com";

async function post(path, body = {}) {
  const res = await fetch(`${root}${path}`, {
    method: "POST",
    headers: {
      "x-soso-api-key": key,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { path, status: res.status, code: json.code, ok: res.ok && json.code === 0 };
}

async function get(path) {
  const res = await fetch(`${root}${path}`, {
    headers: { "x-soso-api-key": key, Accept: "application/json" },
  });
  const json = await res.json();
  return { path, status: res.status, code: json.code, ok: res.ok && json.code === 0 };
}

const checks = [];
const delay = () => new Promise((r) => setTimeout(r, 700));

checks.push(await post("/openapi/v1/data/default/coin/list"));
await delay();
checks.push(await post("/openapi/v2/etf/currentEtfDataMetrics", { type: "us-btc-spot" }));
await delay();
checks.push(await get("/openapi/v1/macro/events"));
await delay();
checks.push(await get("/openapi/v1/crypto-stocks/sectors"));
await delay();
checks.push(await get("/openapi/v1/news/hot?page_size=5"));
await delay();
checks.push(await get("/openapi/v1/indices"));
await delay();
checks.push(await get("/openapi/v1/fundraising/projects"));
await delay();
checks.push(await get("/openapi/v1/btc-treasuries"));
await delay();
checks.push(await get("/openapi/v1/analyses"));

console.log("\nSoSoValue module verification:\n");
for (const c of checks) {
  console.log(c.ok ? "OK  " : "FAIL", c.path, `HTTP ${c.status}`, `code=${c.code}`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} modules reachable`);
process.exit(failed.length ? 1 : 0);

