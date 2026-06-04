"use client";

import { useEffect, useState } from "react";

type Report = {
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

export function WeeklyMemo({ slug }: { slug: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/reports/weekly?slug=${encodeURIComponent(slug)}&refresh=true`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed");
        setReport(data.report);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load memo")
      );
  }, [slug]);

  if (error) {
    return (
      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Weekly AI memo</h2>
        <p className="text-sm text-red-400 mt-2">{error}</p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="bg-surface rounded-2xl border border-border p-6 animate-pulse h-40" />
    );
  }

  return (
    <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold">Weekly AI memo</h2>
        <span
          className={`text-xs rounded-full px-2 py-0.5 border ${
            report.liveIntelligence
              ? "border-emerald-800/50 text-emerald-400"
              : "border-amber-800/50 text-amber-400"
          }`}
        >
          {report.liveIntelligence ? "Live SoSo" : "Snapshot / setup required"}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{report.marketOutlook}</p>
      <p className="text-sm text-muted">{report.portfolioChanges}</p>
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
        Generated {new Date(report.generatedAt).toLocaleString()}
      </p>
    </section>
  );
}
