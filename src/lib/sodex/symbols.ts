/** MVP symbol → SoDEX symbolID map (extend via env or API discovery). */
const DEFAULT_SYMBOL_IDS: Record<string, number> = {
  BTC: 1,
  ETH: 2,
  SOL: 3,
  USDC: 4,
  USDT: 5,
  RNDR: 6,
  TAO: 7,
  AKT: 8,
  AR: 9,
};

export function getSymbolId(symbol: string): number | null {
  const upper = symbol.toUpperCase();
  const fromEnv = process.env[`SODEX_SYMBOL_${upper}`];
  if (fromEnv) {
    const parsed = Number(fromEnv);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return DEFAULT_SYMBOL_IDS[upper] ?? null;
}

export function requireSymbolId(symbol: string): number {
  const id = getSymbolId(symbol);
  if (id === null) {
    throw new Error(
      `No SoDEX symbol mapping for ${symbol}. Set SODEX_SYMBOL_${symbol.toUpperCase()} in env.`
    );
  }
  return id;
}

export function listMappedSymbols(): string[] {
  return Object.keys(DEFAULT_SYMBOL_IDS);
}
