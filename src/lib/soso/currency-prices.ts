import { sosoGet } from "@/lib/soso/fetch";
import { extractList, num } from "@/lib/soso/parsers";
import { listMappedSymbols } from "@/lib/sodex/symbols";

/** SoSo tickers that should map to SoDEX symbols. */
const SYMBOL_ALIASES: Record<string, string> = {
  RENDER: "RNDR",
};

const PRICE_FETCH_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 200;

function currencyIdOf(row: Record<string, unknown>): string | null {
  const raw = row.currencyId ?? row.currency_id;
  if (raw == null) return null;
  const id = String(raw).trim();
  return /^\d+$/.test(id) ? id : null;
}

function symbolOf(row: Record<string, unknown>): string {
  return String(row.currencyName ?? row.symbol ?? row.ticker ?? "")
    .toUpperCase()
    .trim();
}

function wantedSymbols(): Set<string> {
  const set = new Set<string>([
    "BTC",
    "ETH",
    "SOL",
    "RNDR",
    "TAO",
    "AKT",
    "AR",
    "USDC",
    "USDT",
    ...listMappedSymbols(),
  ]);
  for (const [from, to] of Object.entries(SYMBOL_ALIASES)) {
    set.add(from);
    set.add(to);
  }
  return set;
}

function normalizeChangePct(raw: number | undefined): number | undefined {
  if (raw == null || Number.isNaN(raw)) return undefined;
  // SoSo often returns fractional ratios (0.0092 ≈ 0.92%).
  return Math.abs(raw) <= 1 ? raw * 100 : raw;
}

async function fetchMarketSnapshot(
  currencyId: string
): Promise<{ price?: number; change24h?: number } | null> {
  const result = await sosoGet(
    `/openapi/v1/currencies/${currencyId}/market-snapshot`
  );
  if (!result.ok) return null;
  const data = result.data as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return null;
  const price = num(data.price ?? data.lastPrice ?? data.currentPrice);
  const change24h = normalizeChangePct(
    num(data.change_pct_24h ?? data.change24h ?? data.changePercent)
  );
  if (price == null || price <= 0) return null;
  return { price, change24h };
}

/**
 * coin/list returns symbols only. Attach live USD prices from market-snapshot
 * for SoDEX-mapped / priority assets so fund create can mark-to-market.
 */
export async function attachMarketPricesToCoinList(
  data: unknown
): Promise<unknown> {
  const list = extractList(data) as Record<string, unknown>[];
  if (list.length === 0) return data;

  const wanted = wantedSymbols();
  const targets: { row: Record<string, unknown>; id: string; symbol: string }[] =
    [];

  for (const row of list) {
    const symbol = symbolOf(row);
    if (!symbol || !wanted.has(symbol)) continue;
    const existing = num(row.price ?? row.lastPrice ?? row.currentPrice);
    if (existing != null && existing > 0) continue;
    const id = currencyIdOf(row);
    if (!id) continue;
    targets.push({ row, id, symbol });
  }

  // Cap fan-out to protect rate limits.
  for (const target of targets.slice(0, 12)) {
    if (PRICE_FETCH_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, PRICE_FETCH_DELAY_MS));
    }
    const snap = await fetchMarketSnapshot(target.id);
    if (!snap) continue;
    target.row.price = snap.price;
    if (snap.change24h != null) target.row.change24h = snap.change24h;
  }

  // Alias SoSo RENDER → SoDEX RNDR so tradable mapping resolves.
  for (const row of list) {
    const symbol = symbolOf(row);
    const aliased = SYMBOL_ALIASES[symbol];
    if (aliased) {
      row.currencyName = aliased;
      if (!row.fullName && !row.name) row.fullName = symbol;
    }
  }

  return Array.isArray(data) ? list : data;
}

export { SYMBOL_ALIASES };
