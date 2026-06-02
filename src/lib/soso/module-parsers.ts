import type { MarketIntelligencePacket } from "@/lib/types";
import { extractList, num, str } from "@/lib/soso/parsers";

const PRIORITY_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "RNDR",
  "TAO",
  "AKT",
  "AR",
  "LINK",
  "AVAX",
  "USDC",
  "USDT",
];

function inferSentiment(title: string): string | undefined {
  const t = title.toLowerCase();
  if (
    /surge|rally|inflow|gain|bull|record high|breakout|soar/.test(t)
  ) {
    return "bullish";
  }
  if (/drop|fall|outflow|bear|crash|decline|selloff|plunge/.test(t)) {
    return "bearish";
  }
  return "neutral";
}

export function applyFeeds(packet: MarketIntelligencePacket, data: unknown) {
  packet.feeds = [];
  const root = data as Record<string, unknown>;
  const list = extractList(root.list ? root : data);
  for (const item of list.slice(0, 12)) {
    const row = item as Record<string, unknown>;
    const title = str(row.title ?? row.headline, "");
    if (!title) continue;
    packet.feeds.push({
      title,
      summary: str(row.content ?? row.summary).slice(0, 280) || undefined,
      sentiment: str(row.sentiment) || inferSentiment(title),
    });
  }
}

export function applyMacro(packet: MarketIntelligencePacket, data: unknown) {
  packet.macro = [];
  for (const item of extractList(data).slice(0, 8)) {
    const row = item as Record<string, unknown>;
    const events = row.events;
    if (Array.isArray(events)) {
      for (const ev of events.slice(0, 3)) {
        packet.macro.push({
          event: str(ev, "Macro event"),
          date: str(row.date),
          impact: str(row.impact ?? row.importance),
        });
      }
    } else {
      packet.macro.push({
        event: str(row.event ?? row.title, "Macro event"),
        date: str(row.date ?? row.time),
        impact: str(row.impact ?? row.importance),
      });
    }
  }
}

export function applyCurrency(packet: MarketIntelligencePacket, data: unknown) {
  const list = extractList(data) as Record<string, unknown>[];
  const sorted = [...list].sort((a, b) => {
    const sa = str(a.currencyName ?? a.symbol, "").toUpperCase();
    const sb = str(b.currencyName ?? b.symbol, "").toUpperCase();
    const ia = PRIORITY_SYMBOLS.indexOf(sa);
    const ib = PRIORITY_SYMBOLS.indexOf(sb);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return sa.localeCompare(sb);
  });
  packet.currencies = sorted.slice(0, 30).map((row) => {
    const symbol = str(
      row.currencyName ?? row.symbol ?? row.ticker,
      "???"
    ).toUpperCase();
    return {
      symbol,
      name: str(row.fullName ?? row.name, symbol),
      price: num(row.price ?? row.lastPrice),
      change24h: num(row.change24h ?? row.changePercent ?? row.percentChange),
    };
  });
}

export function applyEtfMetrics(packet: MarketIntelligencePacket, data: unknown) {
  packet.etf = [];
  const rows = extractList(data) as Record<string, unknown>[];
  for (const row of rows.slice(0, 8)) {
    const inflow = row.dailyNetInflow as Record<string, unknown> | undefined;
    const flowVal = inflow?.value ?? row.netFlow ?? row.flow;
    packet.etf.push({
      name: str(row.ticker ?? row.name ?? row.etf, "ETF"),
      flow:
        flowVal != null
          ? `${Number(flowVal) >= 0 ? "+" : ""}${flowVal}`
          : undefined,
      changePct: num(
        row.changePercent ?? row.change24h ?? row.discountPremiumRate
      ),
    });
  }
}

export function applyIndexes(packet: MarketIntelligencePacket, data: unknown) {
  packet.indexes = [];
  for (const item of extractList(data).slice(0, 12)) {
    const row = item as Record<string, unknown>;
    packet.indexes.push({
      name: str(
        row.index_name ?? row.name ?? row.index_ticker ?? row.ticker,
        "Index"
      ),
      changePct: num(
        row.change_percent ??
          row.changePercent ??
          row.change_24h ??
          row.change24h
      ),
      sector: str(row.sector ?? row.category),
    });
  }
}

export function applyCryptoStocks(packet: MarketIntelligencePacket, data: unknown) {
  packet.cryptoStocks = [];
  for (const item of extractList(data)) {
    const row = item as Record<string, unknown>;
    const sectorName = str(row.sector_name ?? row.sector ?? row.name, "Sector");
    packet.cryptoStocks.push({
      ticker: str(row.sector_slug ?? row.ticker ?? row.stock_ticker, sectorName),
      sector: sectorName,
      changePct: num(
        row.change_percent ?? row.changePercent ?? row.change_24h
      ),
    });
  }
}

export function applyFundraising(packet: MarketIntelligencePacket, data: unknown) {
  packet.fundraising = [];
  for (const item of extractList(data).slice(0, 10)) {
    const row = item as Record<string, unknown>;
    packet.fundraising.push({
      project: str(row.project_name ?? row.name ?? row.project, "Project"),
      amount: str(row.amount ?? row.total_raised ?? row.latest_round_amount),
      sector: str(row.sector ?? row.ecosystem ?? row.category),
    });
  }
}

export function applyBtcTreasuries(
  packet: MarketIntelligencePacket,
  data: unknown
) {
  packet.btcTreasuries = [];
  for (const item of extractList(data).slice(0, 12)) {
    const row = item as Record<string, unknown>;
    packet.btcTreasuries.push({
      company: str(row.name ?? row.company ?? row.ticker, "Company"),
      btcHoldings: num(
        row.btc_holdings ??
          row.btcHoldings ??
          row.holdings ??
          row.total_btc
      ),
    });
  }
}

export function applyCharts(packet: MarketIntelligencePacket, data: unknown) {
  packet.charts = [];
  for (const item of extractList(data).slice(0, 8)) {
    const row = item as Record<string, unknown>;
    const id = str(row.chart_name ?? row.id ?? row.name, "");
    const title = str(row.title ?? row.chart_name ?? row.name, "Chart");
    if (!id && !title) continue;
    packet.charts!.push({
      id: id || title,
      title,
      category: str(row.category ?? row.module),
    });
  }
}
