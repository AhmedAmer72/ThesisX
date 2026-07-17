"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Report = {
  fundName?: string;
  period?: string;
  marketOutlook: string;
  portfolioChanges: string;
  rationale: string;
  riskAnalysis: string;
  sosoHighlights: string[];
  etfSummary: string;
  macroWatch: string;
  topMovers: string[];
  liveIntelligence: boolean;
  generatedAt: string;
};

type HistoryItem = {
  id: string;
  period: string;
  generatedAt: string;
  report: Report;
};

function formatShareText(report: Report, slug: string): string {
  const lines = [
    `ThesisX Weekly Memo — ${report.fundName ?? slug}`,
    report.period ? `Period: ${report.period}` : null,
    "",
    report.marketOutlook,
    "",
    report.portfolioChanges,
    "",
    "SoSo highlights:",
    ...report.sosoHighlights.map((h) => `• ${h}`),
    "",
    `ETF: ${report.etfSummary}`,
    `Macro: ${report.macroWatch}`,
    report.topMovers.length
      ? `Movers: ${report.topMovers.join(" · ")}`
      : null,
    "",
    `Generated ${new Date(report.generatedAt).toLocaleString()}`,
    "Powered by SoSoValue · ThesisX",
  ];
  return lines.filter(Boolean).join("\n");
}

export function WeeklyMemo({ slug }: { slug: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyState, setCopyState] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/reports/weekly?slug=${encodeURIComponent(slug)}&history=true`
      );
      const data = await r.json();
      if (r.ok && Array.isArray(data.reports)) {
        setHistory(data.reports);
      }
    } catch {
      /* optional */
    }
  }, [slug]);

  const loadLatest = useCallback(
    async (refresh: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/reports/weekly?slug=${encodeURIComponent(slug)}&persist=true${
            refresh ? "&refresh=true" : ""
          }`
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed");
        setReport(data.report);
        await loadHistory();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load memo");
      } finally {
        setLoading(false);
      }
    },
    [slug, loadHistory]
  );

  useEffect(() => {
    void loadLatest(false);
  }, [loadLatest]);

  async function copyShare() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(formatShareText(report, slug));
      setCopyState("Copied shareable memo");
      setTimeout(() => setCopyState(null), 2000);
    } catch {
      setCopyState("Copy failed");
    }
  }

  if (error && !report) {
    return (
      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Weekly AI memo</h2>
        <p className="text-sm text-red-400 mt-2">{error}</p>
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          onClick={() => void loadLatest(true)}
        >
          Retry
        </Button>
      </section>
    );
  }

  if (loading && !report) {
    return (
      <section className="bg-surface rounded-2xl border border-border p-6 animate-pulse h-40" />
    );
  }

  if (!report) return null;

  return (
    <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-start">
        <div>
          <h2 className="font-semibold">Weekly AI research desk</h2>
          {report.period && (
            <p className="text-xs text-muted mt-1">{report.period}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs rounded-full px-2 py-0.5 border ${
              report.liveIntelligence
                ? "border-emerald-800/50 text-emerald-400"
                : "border-amber-800/50 text-amber-400"
            }`}
          >
            {report.liveIntelligence ? "Live SoSo" : "Snapshot / setup required"}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void loadLatest(true)}
            disabled={loading}
          >
            {loading ? "…" : "Regenerate"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void copyShare()}>
            Copy / share
          </Button>
        </div>
      </div>
      {copyState && (
        <p className="text-xs text-emerald-400">{copyState}</p>
      )}
      <p className="text-sm leading-relaxed">{report.marketOutlook}</p>
      <p className="text-sm text-muted">{report.portfolioChanges}</p>
      {report.rationale && (
        <p className="text-sm text-muted">{report.rationale}</p>
      )}
      {report.riskAnalysis && (
        <p className="text-sm text-muted">
          <span className="text-foreground">Risk: </span>
          {report.riskAnalysis}
        </p>
      )}
      <ul className="text-sm space-y-1 text-muted list-disc pl-4">
        {report.sosoHighlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted pt-2 border-t border-border">
        <div>
          <p className="uppercase tracking-wider mb-1">ETF</p>
          <p>{report.etfSummary}</p>
        </div>
        <div>
          <p className="uppercase tracking-wider mb-1">Macro</p>
          <p>{report.macroWatch}</p>
        </div>
      </div>
      {report.topMovers.length > 0 && (
        <p className="text-xs text-muted">
          Movers: {report.topMovers.join(" · ")}
        </p>
      )}
      <p className="text-xs text-muted">
        Generated {new Date(report.generatedAt).toLocaleString()} · also produced
        by daily autonomous cron
      </p>

      {history.length > 1 && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs uppercase tracking-wider text-muted mb-2">
            Archive
          </p>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="text-left text-xs text-muted hover:text-foreground w-full py-1"
                  onClick={() => setReport(h.report)}
                >
                  {h.period} · {new Date(h.generatedAt).toLocaleDateString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
