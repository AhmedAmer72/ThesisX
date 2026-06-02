import type {

  IntelligenceSource,

  IntelligenceModuleHealth,

  MarketIntelligencePacket,

} from "@/lib/types";

import { getDemoIntelligencePacket } from "@/lib/soso/demo-data";

import { SosoSetupError, SosoLiveRequiredError } from "@/lib/soso/errors";

import { hasSosoApiKey, isLiveIntelligenceRequired } from "@/lib/soso/fetch";
import { isDemoPacketAllowed } from "@/lib/buildathon";
import { attachSignalsToPacket } from "@/lib/soso/signals";

import { listCacheFreshness } from "@/lib/soso/cache";

import {

  CHART_HEAVY_MODULES,

  CORE_MODULES,

} from "@/lib/soso/endpoints";

import {

  getModuleDefs,

  getModuleDef,

  fetchAllModules,

  fetchModule,

  probeModule,

  buildNarratives,

  computeTopMovers,

  computeMarketPulse,

  type SosoModuleId,

  type ModuleFetchMeta,

} from "@/lib/soso/modules";



export type BuildPacketOptions = {

  /** When true, missing key or failed fetch throws instead of demo fallback */

  liveOnly?: boolean;

  modules?: SosoModuleId[];

  useCache?: boolean;

  /** Fetch chart-heavy module set (currency, etf, macro, index, feeds, charts) */

  chartHeavy?: boolean;

};



function emptyPacket(): MarketIntelligencePacket {

  return {

    fetchedAt: new Date().toISOString(),

    demoMode: false,

    sources: [],

    moduleHealth: [],

    feeds: [],

    etf: [],

    indexes: [],

    macro: [],

    currencies: [],

    fundraising: [],

    btcTreasuries: [],

    cryptoStocks: [],

    charts: [],

    narratives: [],

    narrativeTags: [],

    topMovers: [],

    benchmarks: [],

    marketPulse: {

      riskOnScore: 0,

      etfInflowCount: 0,

      bullishHeadlines: 0,

      indexesPositive: 0,

    },

  };

}



function metaToHealth(meta: ModuleFetchMeta): IntelligenceModuleHealth {

  return {

    module: meta.module,

    label: meta.label,

    endpoint: meta.endpoint,

    status: meta.status === "error" ? "error" : "ok",

    error: meta.error,

    fetchedAt: meta.fetchedAt,

    cacheHit: meta.cacheHit,

  };

}



function metaToSource(meta: ModuleFetchMeta): IntelligenceSource {

  return {

    module: meta.module,

    endpoint: meta.endpoint,

    label: meta.label,

    fetchedAt: meta.fetchedAt,

    cacheHit: meta.cacheHit,

  };

}



function finalizePacket(

  packet: MarketIntelligencePacket,

  metas: ModuleFetchMeta[]

): MarketIntelligencePacket {

  packet.fetchedAt = new Date().toISOString();

  packet.demoMode = false;

  packet.moduleHealth = metas.map(metaToHealth);

  packet.sources = metas

    .filter((m) => m.status !== "error")

    .map(metaToSource);

  packet.narratives = buildNarratives(packet);

  packet.narrativeTags = [...packet.narratives];

  packet.topMovers = computeTopMovers(packet);

  packet.benchmarks = packet.indexes.slice(0, 5).map((i) => ({

    name: i.name,

    changePct: i.changePct,

    sector: i.sector,

  }));

  packet.marketPulse = computeMarketPulse(packet);

  return packet;

}



function resolveModuleList(options: BuildPacketOptions): SosoModuleId[] | undefined {

  if (options.modules?.length) return options.modules;

  if (options.chartHeavy) return CHART_HEAVY_MODULES;

  return undefined;

}



export class SosoClient {

  private shouldAllowDemo(): boolean {
    return isDemoPacketAllowed();
  }



  async buildIntelligencePacket(

    options: BuildPacketOptions = {}

  ): Promise<MarketIntelligencePacket> {

    const liveOnly = options.liveOnly ?? isLiveIntelligenceRequired();

    const useCache = options.useCache ?? true;

    const moduleList = resolveModuleList(options);



    if (!hasSosoApiKey()) {

      if (liveOnly) throw new SosoSetupError();

      if (this.shouldAllowDemo()) {

        const demo = getDemoIntelligencePacket();

        demo.demoMode = true;

        return demo;

      }

      throw new SosoSetupError();

    }



    const packet = emptyPacket();

    let metas: ModuleFetchMeta[] = [];

    let errors: Record<string, string> = {};



    if (moduleList?.length) {

      for (const id of moduleList) {

        if (id === "etf") continue;

        const def = getModuleDef(id);

        if (!def) continue;

        if (process.env.NODE_ENV !== "test") {
          await new Promise((r) => setTimeout(r, 500));
        }

        const { ok, meta, raw } = await fetchModule(def, useCache);

        metas.push(meta);

        if (ok && raw !== undefined) def.apply(packet, raw);

        else errors[id] = meta.error ?? "unknown";

      }

      if (!moduleList || moduleList.includes("etf")) {

        const batch = await fetchAllModules(useCache, ["etf"]);

        metas.push(...batch.metas);

        for (const { def, raw } of batch.results) def.apply(packet, raw);

        Object.assign(errors, batch.errors);

      }

    } else {

      const batch = await fetchAllModules(useCache, CORE_MODULES);

      metas = batch.metas;

      errors = batch.errors;

      for (const { def, raw } of batch.results) {

        def.apply(packet, raw);

      }

    }



    const okCount = metas.filter((m) => m.status !== "error").length;

    if (okCount === 0) {

      if (liveOnly || !this.shouldAllowDemo()) {

        throw new SosoLiveRequiredError(undefined, errors);

      }

      const demo = getDemoIntelligencePacket();

      demo.demoMode = true;

      return demo;

    }



    const finalized = finalizePacket(packet, metas);
    return attachSignalsToPacket(finalized);
  }



  async getModuleHealth(options?: {

    live?: boolean;

  }): Promise<{

    configured: boolean;

    modules: IntelligenceModuleHealth[];

    cacheEntries: Awaited<ReturnType<typeof listCacheFreshness>>;

    liveProbed: boolean;

  }> {

    const cacheEntries = await listCacheFreshness();

    const live = options?.live ?? process.env.SOSO_HEALTH_LIVE !== "false";



    if (!hasSosoApiKey()) {

      return {

        configured: false,

        modules: getModuleDefs().map((d) => ({

          module: d.module,

          label: d.label,

          endpoint: d.path,

          status: "error" as const,

          error: "missing_api_key",

          fetchedAt: new Date().toISOString(),

          cacheHit: false,

        })),

        cacheEntries,

        liveProbed: false,

      };

    }



    if (live) {

      const defs = getModuleDefs();

      const etfDef = getModuleDef("etf");

      const allIds = [

        ...defs.map((d) => d.module),

        ...(etfDef ? (["etf"] as const) : []),

      ];

      const modules: IntelligenceModuleHealth[] = [];

      for (const id of allIds) {

        if (process.env.NODE_ENV !== "test") {
          await new Promise((r) => setTimeout(r, 400));
        }

        const meta = await probeModule(id);

        modules.push(metaToHealth(meta));

      }

      return { configured: true, modules, cacheEntries, liveProbed: true };

    }



    const modules: IntelligenceModuleHealth[] = getModuleDefs().map((d) => {

      const hit = cacheEntries.find(

        (c) => c.module === d.module && c.key === d.cacheKey

      );

      return {

        module: d.module,

        label: d.label,

        endpoint: d.path,

        status: hit ? ("ok" as const) : ("error" as const),

        error: hit ? undefined : "not_cached_yet",

        fetchedAt: hit?.fetchedAt ?? new Date().toISOString(),

        cacheHit: Boolean(hit),

      };

    });



    const etfHit = cacheEntries.find(

      (c) => c.module === "etf" && c.key === "current-metrics"

    );

    modules.push({

      module: "etf",

      label: "ETF Metrics",

      endpoint: getModuleDef("etf")?.path ?? "/openapi/v2/etf/currentEtfDataMetrics",

      status: etfHit ? "ok" : "error",

      error: etfHit ? undefined : "not_cached_yet",

      fetchedAt: etfHit?.fetchedAt ?? new Date().toISOString(),

      cacheHit: Boolean(etfHit),

    });



    return { configured: true, modules, cacheEntries, liveProbed: false };

  }

}



export const sosoClient = new SosoClient();


