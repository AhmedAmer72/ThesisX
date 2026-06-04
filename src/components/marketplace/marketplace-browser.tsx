"use client";

import { useMemo, useState } from "react";
import { FundCard, type FundCardData } from "@/components/fund/fund-card";

export type MarketplaceFund = FundCardData & {
  createdAt: string;
  status: string;
  drawdownPct?: number;
  dataFreshness: "live" | "demo";
  narratives?: string[];
  sosoModules?: string[];
};

type SortKey = "newest" | "confidence" | "return" | "drawdown";

const RISK_LEVELS = ["low", "medium", "high", "aggressive"] as const;

export function MarketplaceBrowser({ funds }: { funds: MarketplaceFund[] }) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<string>("all");
  const [sector, setSector] = useState<string>("all");
  const [freshness, setFreshness] = useState<string>("all");
  const [narrative, setNarrative] = useState<string>("all");
  const [sosoModule, setSosoModule] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const f of funds) {
      if (f.strategyType) set.add(f.strategyType);
    }
    return Array.from(set).sort();
  }, [funds]);

  const narrativeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const f of funds) {
      for (const n of f.narratives ?? []) {
        if (n.length > 3) set.add(n.slice(0, 40));
      }
    }
    return Array.from(set).sort().slice(0, 12);
  }, [funds]);

  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const f of funds) {
      for (const m of f.sosoModules ?? []) set.add(m);
    }
    return Array.from(set).sort();
  }, [funds]);

  const filtered = useMemo(() => {
    let list = [...funds];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.strategyType.toLowerCase().includes(q) ||
          (f.thesisSnippet?.toLowerCase().includes(q) ?? false)
      );
    }
    if (risk !== "all") list = list.filter((f) => f.riskLevel === risk);
    if (sector !== "all")
      list = list.filter((f) => f.strategyType === sector);
    if (freshness !== "all")
      list = list.filter((f) => f.dataFreshness === freshness);
    if (narrative !== "all") {
      list = list.filter((f) =>
        (f.narratives ?? []).some((n) => n.includes(narrative))
      );
    }
    if (sosoModule !== "all") {
      list = list.filter((f) => (f.sosoModules ?? []).includes(sosoModule));
    }

    list.sort((a, b) => {
      switch (sort) {
        case "confidence":
          return (b.confidence ?? 0) - (a.confidence ?? 0);
        case "return":
          return (b.weeklyReturn ?? 0) - (a.weeklyReturn ?? 0);
        case "drawdown":
          return (a.drawdownPct ?? 0) - (b.drawdownPct ?? 0);
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
    return list;
  }, [funds, query, risk, sector, freshness, narrative, sosoModule, sort]);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <label className="flex-1 min-w-[200px]">
          <span className="text-xs text-muted uppercase tracking-wider">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, strategy, thesis..."
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-border-strong"
          />
        </label>
        <label>
          <span className="text-xs text-muted uppercase tracking-wider">
            Risk
          </span>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs text-muted uppercase tracking-wider">
            Strategy
          </span>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs text-muted uppercase tracking-wider">
            Data
          </span>
          <select
            value={freshness}
            onChange={(e) => setFreshness(e.target.value)}
            className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="demo">Demo</option>
          </select>
        </label>
        {narrativeOptions.length > 0 && (
          <label>
            <span className="text-xs text-muted uppercase tracking-wider">
              Narrative
            </span>
            <select
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {narrativeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        {moduleOptions.length > 0 && (
          <label>
            <span className="text-xs text-muted uppercase tracking-wider">
              SoSo module
            </span>
            <select
              value={sosoModule}
              onChange={(e) => setSosoModule(e.target.value)}
              className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {moduleOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="text-xs text-muted uppercase tracking-wider">
            Sort
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="mt-1 block rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="confidence">Confidence</option>
            <option value="return">Return</option>
            <option value="drawdown">Low drawdown</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-muted">
        {filtered.length} of {funds.length} funds
      </p>

      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center text-muted text-sm">
          No funds match your filters.{" "}
          <button
            type="button"
            className="underline text-foreground"
            onClick={() => {
              setQuery("");
              setRisk("all");
              setSector("all");
              setFreshness("all");
              setNarrative("all");
              setSosoModule("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <FundCard key={f.slug} fund={f} />
          ))}
        </div>
      )}
    </div>
  );
}
