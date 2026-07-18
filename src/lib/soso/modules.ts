import type { MarketIntelligencePacket } from "@/lib/types";

import { getCachedModule, setCachedModule } from "@/lib/soso/cache";

import { sosoGet, sosoPost } from "@/lib/soso/fetch";
import { attachMarketPricesToCoinList } from "@/lib/soso/currency-prices";

import {
  SOSO_ENDPOINTS,
  ALL_MODULE_IDS,
  type SosoModuleId,
} from "@/lib/soso/endpoints";

export type { SosoModuleId };

const MODULE_DELAY_MS =
  process.env.NODE_ENV === "test" ? 0 : 500;

async function moduleDelay(extra = 0) {
  const ms = MODULE_DELAY_MS + extra;
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}

import {

  applyFeeds,

  applyMacro,

  applyCurrency,

  applyEtfMetrics,

  applyIndexes,

  applyCryptoStocks,

  applyFundraising,

  applyBtcTreasuries,

  applyCharts,

} from "@/lib/soso/module-parsers";



export type ModuleFetchMeta = {

  module: SosoModuleId;

  endpoint: string;

  label: string;

  status: "ok" | "error" | "cached";

  error?: string;

  fetchedAt: string;

  cacheHit: boolean;

};



type ModuleDef = {

  module: SosoModuleId;

  path: string;

  label: string;

  cacheKey: string;

  method: "GET" | "POST";

  body?: Record<string, unknown>;

  apply: (packet: MarketIntelligencePacket, data: unknown) => void;

};



const ETF_TYPES = ["us-btc-spot", "us-eth-spot", "us-sol-spot"] as const;



const APPLY_BY_MODULE: Record<

  SosoModuleId,

  (packet: MarketIntelligencePacket, data: unknown) => void

> = {

  feeds: applyFeeds,

  macro: applyMacro,

  currency: applyCurrency,

  etf: applyEtfMetrics,

  index: applyIndexes,

  "crypto-stocks": applyCryptoStocks,

  fundraising: applyFundraising,

  "btc-treasuries": applyBtcTreasuries,

  charts: applyCharts,

};



function buildModuleDefs(): ModuleDef[] {

  return ALL_MODULE_IDS.filter((id) => id !== "etf").map((id) => {

    const ep = SOSO_ENDPOINTS[id];

    return {

      module: id,

      path: ep.path,

      label: ep.label,

      cacheKey: ep.cacheKey,

      method: ep.method,

      body: ep.method === "POST" ? {} : undefined,

      apply: APPLY_BY_MODULE[id],

    };

  });

}



const MODULE_DEFS = buildModuleDefs();



export function getModuleDefs(): ModuleDef[] {

  return MODULE_DEFS;

}



export function getModuleDef(id: SosoModuleId): ModuleDef | undefined {

  if (id === "etf") {

    return {

      module: "etf",

      path: SOSO_ENDPOINTS.etf.path,

      label: SOSO_ENDPOINTS.etf.label,

      cacheKey: SOSO_ENDPOINTS.etf.cacheKey,

      method: "POST",

      body: {},

      apply: applyEtfMetrics,

    };

  }

  if (id === "currency") {

    return {

      module: "currency",

      path: SOSO_ENDPOINTS.currency.path,

      label: SOSO_ENDPOINTS.currency.label,

      cacheKey: SOSO_ENDPOINTS.currency.cacheKey,

      method: "POST",

      body: {},

      apply: applyCurrency,

    };

  }

  return MODULE_DEFS.find((m) => m.module === id);

}



async function fetchCurrencyModule(

  useCache: boolean

): Promise<{ ok: boolean; meta: ModuleFetchMeta; raw?: unknown }> {

  const moduleId = "currency" as const;

  const cacheKey = SOSO_ENDPOINTS.currency.cacheKey;

  const endpoint = SOSO_ENDPOINTS.currency.path;



  if (useCache) {

    const cached = await getCachedModule<unknown>(moduleId, cacheKey);

    if (cached) {

      return {

        ok: true,

        raw: cached.data,

        meta: {

          module: moduleId,

          endpoint,

          label: SOSO_ENDPOINTS.currency.label,

          status: "cached",

          fetchedAt: cached.fetchedAt,

          cacheHit: true,

        },

      };

    }

  }



  const listResult = await sosoPost(endpoint, {});

  if (!listResult.ok) {

    return {

      ok: false,

      meta: {

        module: moduleId,

        endpoint,

        label: SOSO_ENDPOINTS.currency.label,

        status: "error",

        error: listResult.error,

        fetchedAt: new Date().toISOString(),

        cacheHit: false,

      },

    };

  }



  const priced = await attachMarketPricesToCoinList(listResult.data);

  const fetchedAt = await setCachedModule(moduleId, cacheKey, priced);

  return {

    ok: true,

    raw: priced,

    meta: {

      module: moduleId,

      endpoint,

      label: SOSO_ENDPOINTS.currency.label,

      status: "ok",

      fetchedAt,

      cacheHit: false,

    },

  };

}



async function fetchEtfModule(

  useCache: boolean

): Promise<{ ok: boolean; meta: ModuleFetchMeta; raw?: unknown }> {

  const moduleId = "etf" as const;

  const cacheKey = SOSO_ENDPOINTS.etf.cacheKey;

  const endpoint = SOSO_ENDPOINTS.etf.path;



  if (useCache) {

    const cached = await getCachedModule<unknown>(moduleId, cacheKey);

    if (cached) {

      return {

        ok: true,

        raw: cached.data,

        meta: {

          module: moduleId,

          endpoint,

          label: SOSO_ENDPOINTS.etf.label,

          status: "cached",

          fetchedAt: cached.fetchedAt,

          cacheHit: true,

        },

      };

    }

  }



  const combined: unknown[] = [];

  for (const etfType of ETF_TYPES) {

    await moduleDelay(200);

    const result = await sosoPost(endpoint, { type: etfType });

    if (result.ok) {

      const data = result.data as Record<string, unknown>;

      const list = (data.list as unknown[]) ?? extractListFromData(result.data);

      for (const item of list) {

        combined.push({ ...(item as object), etf: etfType });

      }

    }

  }



  if (combined.length === 0) {

    return {

      ok: false,

      meta: {

        module: moduleId,

        endpoint,

        label: SOSO_ENDPOINTS.etf.label,

        status: "error",

        error: "etf_fetch_failed",

        fetchedAt: new Date().toISOString(),

        cacheHit: false,

      },

    };

  }



  const fetchedAt = await setCachedModule(moduleId, cacheKey, combined);

  return {

    ok: true,

    raw: combined,

    meta: {

      module: moduleId,

      endpoint,

      label: SOSO_ENDPOINTS.etf.label,

      status: "ok",

      fetchedAt,

      cacheHit: false,

    },

  };

}



function extractListFromData(data: unknown): unknown[] {

  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {

    const o = data as Record<string, unknown>;

    for (const k of ["data", "list", "items", "result", "records"]) {

      if (Array.isArray(o[k])) return o[k] as unknown[];

    }

  }

  return [];

}



export async function fetchModule(

  def: ModuleDef,

  useCache: boolean

): Promise<{ ok: boolean; meta: ModuleFetchMeta; raw?: unknown }> {

  if (def.module === "currency") {

    return fetchCurrencyModule(useCache);

  }



  if (useCache) {

    const cached = await getCachedModule<unknown>(def.module, def.cacheKey);

    if (cached) {

      return {

        ok: true,

        raw: cached.data,

        meta: {

          module: def.module,

          endpoint: def.path,

          label: def.label,

          status: "cached",

          fetchedAt: cached.fetchedAt,

          cacheHit: true,

        },

      };

    }

  }



  const result =

    def.method === "POST"

      ? await sosoPost(def.path, def.body ?? {})

      : await sosoGet(def.path);



  if (!result.ok) {

    return {

      ok: false,

      meta: {

        module: def.module,

        endpoint: def.path,

        label: def.label,

        status: "error",

        error: result.error,

        fetchedAt: new Date().toISOString(),

        cacheHit: false,

      },

    };

  }



  const fetchedAt = await setCachedModule(def.module, def.cacheKey, result.data);

  return {

    ok: true,

    raw: result.data,

    meta: {

      module: def.module,

      endpoint: def.path,

      label: def.label,

      status: "ok",

      fetchedAt,

      cacheHit: false,

    },

  };

}



/** Live probe — always hits network, no cache read. */

export async function probeModule(

  id: SosoModuleId

): Promise<ModuleFetchMeta> {

  if (id === "etf") {

    const ep = SOSO_ENDPOINTS.etf;

    const result = await sosoPost(ep.path, { type: "us-btc-spot" });

    return {

      module: "etf",

      endpoint: ep.path,

      label: ep.label,

      status: result.ok ? "ok" : "error",

      error: result.ok ? undefined : result.error,

      fetchedAt: new Date().toISOString(),

      cacheHit: false,

    };

  }

  const def = getModuleDef(id);

  if (!def) {

    return {

      module: id,

      endpoint: "unknown",

      label: id,

      status: "error",

      error: "unknown_module",

      fetchedAt: new Date().toISOString(),

      cacheHit: false,

    };

  }

  const result =

    def.method === "POST"

      ? await sosoPost(def.path, def.body ?? {})

      : await sosoGet(def.path);

  return {

    module: def.module,

    endpoint: def.path,

    label: def.label,

    status: result.ok ? "ok" : "error",

    error: result.ok ? undefined : result.error,

    fetchedAt: new Date().toISOString(),

    cacheHit: false,

  };

}



export async function fetchAllModules(

  useCache: boolean,

  moduleIds?: SosoModuleId[]

): Promise<{

  metas: ModuleFetchMeta[];

  errors: Record<string, string>;

  results: { def: ModuleDef; raw: unknown }[];

}> {

  const metas: ModuleFetchMeta[] = [];

  const errors: Record<string, string> = {};

  const results: { def: ModuleDef; raw: unknown }[] = [];

  const ids = moduleIds ?? ALL_MODULE_IDS;



  for (const id of ids) {

    if (id === "etf") continue;

    const def = getModuleDef(id);

    if (!def) continue;

    await moduleDelay();

    const { ok, meta, raw } = await fetchModule(def, useCache);

    metas.push(meta);

    if (ok && raw !== undefined) {

      results.push({ def, raw });

    } else {

      errors[def.module] = meta.error ?? "unknown";

    }

  }



  if (!moduleIds || moduleIds.includes("etf")) {

    await moduleDelay();

    const etf = await fetchEtfModule(useCache);

    metas.push(etf.meta);

    if (etf.ok && etf.raw !== undefined) {

      results.push({

        def: getModuleDef("etf")!,

        raw: etf.raw,

      });

    } else {

      errors.etf = etf.meta.error ?? "unknown";

    }

  }



  return { metas, errors, results };

}



export function buildNarratives(packet: MarketIntelligencePacket): string[] {

  const tags = new Set<string>();

  for (const f of packet.feeds.slice(0, 4)) tags.add(f.title);

  for (const i of packet.indexes.filter((x) => (x.changePct ?? 0) > 0).slice(0, 3)) {

    tags.add(`${i.name} momentum`);

  }

  for (const fr of packet.fundraising.slice(0, 2)) {

    if (fr.sector) tags.add(`${fr.sector} sector strength`);

  }

  for (const cs of packet.cryptoStocks

    .filter((x) => (x.changePct ?? 0) > 0)

    .slice(0, 2)) {

    tags.add(`${cs.sector ?? cs.ticker} equities`);

  }

  if (packet.btcTreasuries.length > 0) tags.add("Corporate BTC treasury demand");

  for (const m of packet.macro.slice(0, 3)) tags.add(m.event);

  for (const e of packet.etf.slice(0, 2)) {

    if (e.flow) tags.add(`${e.name} ETF flow ${e.flow}`);

  }

  return Array.from(tags).slice(0, 12);

}



export function computeTopMovers(

  packet: MarketIntelligencePacket

): MarketIntelligencePacket["topMovers"] {

  const fromCurrency = [...packet.currencies]

    .filter((c) => c.change24h != null && !["USDC", "USDT"].includes(c.symbol))

    .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));



  if (fromCurrency.length > 0) {

    return fromCurrency.slice(0, 5).map((c) => ({

      symbol: c.symbol,

      name: c.name,

      change24h: c.change24h!,

      price: c.price,

    }));

  }



  return packet.cryptoStocks

    .filter((s) => s.changePct != null)

    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))

    .slice(0, 5)

    .map((s) => ({

      symbol: s.ticker,

      name: s.sector ?? s.ticker,

      change24h: s.changePct!,

    }));

}



export function computeMarketPulse(packet: MarketIntelligencePacket) {

  const etfInflow = packet.etf.filter((e) => {

    const flow = (e.flow ?? "").replace(/[^0-9.-]/g, "");

    return flow.startsWith("+") || Number(flow) > 0;

  }).length;

  const bullishNews = packet.feeds.filter((f) => f.sentiment === "bullish").length;

  const indexUp = packet.indexes.filter((i) => (i.changePct ?? 0) > 0).length;

  const sectorUp = packet.cryptoStocks.filter((s) => (s.changePct ?? 0) > 0).length;

  const riskOnScore = Math.min(

    100,

    etfInflow * 18 +

      bullishNews * 8 +

      indexUp * 10 +

      sectorUp * 8 +

      packet.macro.length * 3

  );

  return {

    riskOnScore,

    etfInflowCount: etfInflow,

    bullishHeadlines: bullishNews,

    indexesPositive: indexUp || sectorUp,

    topHeadline:

      packet.feeds[0]?.title ??

      (packet.macro[0]

        ? `Macro: ${packet.macro[0].event}`

        : packet.etf[0]

          ? `ETF ${packet.etf[0].name}`

          : undefined),

    leadingIndex: packet.indexes[0]?.name ?? packet.cryptoStocks[0]?.sector,

  };

}


