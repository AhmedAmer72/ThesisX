"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AiCopilotPanel({ fundId }: { fundId?: string }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, fundId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Copilot failed");
      const summary =
        typeof data.output?.summary === "string"
          ? data.output.summary
          : JSON.stringify(data.output, null, 2);
      setAnswer(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copilot failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about macro, ETF flows, allocations, or risk..."
        className="w-full min-h-[88px] rounded-xl border border-border bg-page-background px-3 py-2 text-sm"
      />
      <Button onClick={ask} disabled={loading}>
        {loading ? "Analyzing..." : "Ask copilot"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {answer && (
        <div className="rounded-xl border border-border bg-elevated p-4 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
