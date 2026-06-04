import { cn } from "@/lib/utils";

export function FundMetricGrid({
  metrics,
}: {
  metrics: {
    label: string;
    value: string;
    tone?: "default" | "positive" | "negative";
  }[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="dashboard-stat">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            {m.label}
          </p>
          <p
            className={cn(
              "dashboard-stat-value mt-1",
              m.tone === "positive" && "text-emerald-400",
              m.tone === "negative" && "text-red-400"
            )}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
