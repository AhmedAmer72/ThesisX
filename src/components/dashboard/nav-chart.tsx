"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = { date: string; nav: number; pnlPct: number };

export function NavChart({ points }: { points: Point[] }) {
  if (!points.length) {
    return (
      <p className="text-sm text-muted py-8 text-center">
        No performance history yet. NAV updates after live reconciliation.
      </p>
    );
  }

  const data = [...points].reverse().map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    nav: p.nav,
    pnlPct: p.pnlPct,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#888" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#888"
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 8,
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, "NAV"]}
          />
          <Line
            type="monotone"
            dataKey="nav"
            stroke="#c9a227"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
