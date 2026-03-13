import type { Allocation, MarketIntelligencePacket } from "@/lib/types";
import { normalizeAllocations, type RiskLimits } from "@/lib/risk/engine";
import { priceMapFromIntel } from "@/lib/portfolio/mark-to-market";
import { getSymbolId } from "@/lib/sodex/symbols";

const STABLES = new Set(["USDC", "USDT", "DAI"]);

/** Valid ticker: 2–10 uppercase letters (filters SoSo junk like "00", "???"). */
export function isValidSymbolFormat(symbol: string): boolean {
  const upper = symbol.toUpperCase().trim();
  return /^[A-Z]{2,10}$/.test(upper) && upper !== "???";
}

export function isSodexMappable(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  if (STABLES.has(upper)) return true;
  return getSymbolId(upper) !== null;
}

export function hasLivePrice(
  symbol: string,
  prices: Record<string, number>
): boolean {
  const upper = symbol.toUpperCase();
  if (STABLES.has(upper)) return true;
  const px = prices[upper];
  return typeof px === "number" && px > 0;
}

export function isTradableSymbol(
  symbol: string,
  prices: Record<string, number>
): boolean {
  const upper = symbol.toUpperCase();
  if (!isValidSymbolFormat(upper)) return false;
  if (STABLES.has(upper)) return true;
  return isSodexMappable(upper) && hasLivePrice(upper, prices);
}

export function filterTradableAllocations(
  allocations: Allocation[],
  prices: Record<string, number>,
  limits?: RiskLimits
): Allocation[] {
  const filtered = allocations.filter((a) => {
    const sym = a.symbol.toUpperCase();
    if (STABLES.has(sym)) return true;
    return isTradableSymbol(sym, prices);
  });
  if (filtered.length === 0) return [];
  if (!limits) return filtered;
  return normalizeAllocations(filtered, limits);
}

export function getTradableCurrencySymbols(
  intel: MarketIntelligencePacket
): string[] {
  const prices = priceMapFromIntel(intel);
  return intel.currencies
    .filter((c) => c.symbol && isTradableSymbol(c.symbol, prices))
    .map((c) => c.symbol.toUpperCase());
}

export function listUnmappedAllocationSymbols(
  allocations: Allocation[]
): string[] {
  return allocations
    .filter((a) => !STABLES.has(a.symbol.toUpperCase()))
    .filter((a) => !isSodexMappable(a.symbol))
    .map((a) => a.symbol.toUpperCase());
}

export function listUnpricedAllocationSymbols(
  allocations: Allocation[],
  prices: Record<string, number>
): string[] {
  return allocations
    .filter((a) => !STABLES.has(a.symbol.toUpperCase()))
    .filter((a) => !hasLivePrice(a.symbol, prices))
    .map((a) => a.symbol.toUpperCase());
}
