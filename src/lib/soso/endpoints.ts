export type SosoModuleId =
  | "feeds"
  | "etf"
  | "index"
  | "macro"
  | "currency"
  | "fundraising"
  | "btc-treasuries"
  | "crypto-stocks"
  | "charts";

/** Canonical SoSo OpenAPI paths (v1 base: /openapi/v1). Override via env if needed. */
export const SOSO_ENDPOINTS: Record<
  SosoModuleId,
  { path: string; method: "GET" | "POST"; label: string; cacheKey: string }
> = {
  currency: {
    path:
      process.env.SOSO_CURRENCY_PATH ??
      "/openapi/v1/data/default/coin/list",
    method: "POST",
    label: "Listed Currencies",
    // Includes market-snapshot prices attached after coin/list.
    cacheKey: "coin-list-priced",
  },
  etf: {
    path:
      process.env.SOSO_ETF_PATH ??
      "/openapi/v2/etf/currentEtfDataMetrics",
    method: "POST",
    label: "ETF Metrics",
    cacheKey: "current-metrics",
  },
  macro: {
    path: process.env.SOSO_MACRO_PATH ?? "/openapi/v1/macro/events",
    method: "GET",
    label: "Macro Events",
    cacheKey: "events",
  },
  "crypto-stocks": {
    path:
      process.env.SOSO_CRYPTO_STOCKS_PATH ??
      "/openapi/v1/crypto-stocks/sectors",
    method: "GET",
    label: "Crypto Stock Sectors",
    cacheKey: "sectors",
  },
  feeds: {
    path: process.env.SOSO_FEEDS_PATH ?? "/openapi/v1/news/hot",
    method: "GET",
    label: "Hot News",
    cacheKey: "hot-news",
  },
  index: {
    path: process.env.SOSO_INDEX_PATH ?? "/openapi/v1/indices",
    method: "GET",
    label: "SSI Indexes",
    cacheKey: "index-list",
  },
  fundraising: {
    path:
      process.env.SOSO_FUNDRAISING_PATH ??
      "/openapi/v1/fundraising/projects",
    method: "GET",
    label: "Fundraising Projects",
    cacheKey: "projects",
  },
  "btc-treasuries": {
    path:
      process.env.SOSO_BTC_TREASURIES_PATH ?? "/openapi/v1/btc-treasuries",
    method: "GET",
    label: "BTC Treasuries",
    cacheKey: "treasuries",
  },
  charts: {
    path: process.env.SOSO_CHARTS_PATH ?? "/openapi/v1/analyses",
    method: "GET",
    label: "Analysis Charts",
    cacheKey: "chart-list",
  },
};

export const ALL_MODULE_IDS = Object.keys(SOSO_ENDPOINTS) as SosoModuleId[];

export const CHART_HEAVY_MODULES: SosoModuleId[] = [
  "currency",
  "etf",
  "macro",
  "index",
  "feeds",
  "charts",
];

export const CORE_MODULES: SosoModuleId[] = [
  "currency",
  "etf",
  "macro",
  "crypto-stocks",
  "feeds",
  "index",
  "fundraising",
  "btc-treasuries",
  "charts",
];

export const FULL_MODULE_COUNT = CORE_MODULES.length;
