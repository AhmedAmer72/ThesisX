import { readFileSync } from "fs";
import { applyCurrency } from "../src/lib/soso/module-parsers";
import { fetchModule, getModuleDef } from "../src/lib/soso/modules";
import { priceMapFromIntel } from "../src/lib/portfolio/mark-to-market";
import { getTradableCurrencySymbols } from "../src/lib/sodex/tradable";
import type { MarketIntelligencePacket } from "../src/lib/types";

const rawEnv = readFileSync(".env", "utf8").replace(/^\uFEFF/, "");
for (const line of rawEnv.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const m = t.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const def = getModuleDef("currency");
  if (!def) throw new Error("missing currency module");

  const { ok, raw, meta } = await fetchModule(def, false);
  if (!ok || raw === undefined) {
    console.error("currency fetch failed", meta);
    process.exit(1);
  }

  const packet: MarketIntelligencePacket = {
    fetchedAt: new Date().toISOString(),
    demoMode: false,
    sources: [],
    feeds: [],
    etf: [],
    indexes: [],
    macro: [],
    currencies: [],
    fundraising: [],
    btcTreasuries: [],
    cryptoStocks: [],
    narratives: [],
  };

  applyCurrency(packet, raw);
  const prices = priceMapFromIntel(packet);
  const tradable = getTradableCurrencySymbols(packet);
  const nonStable = tradable.filter(
    (s) => !["USDC", "USDT", "DAI"].includes(s)
  );

  console.log("status", meta.status);
  console.log(
    "priced",
    Object.entries(prices).filter(
      ([k]) => !["USDC", "USDT", "DAI"].includes(k)
    )
  );
  console.log("tradable", tradable);

  if (nonStable.length === 0) {
    console.error("NO_TRADABLE_ASSETS still present");
    process.exit(2);
  }

  console.log("ok", nonStable.length, "tradable non-stable assets");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});