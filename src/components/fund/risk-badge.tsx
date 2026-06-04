export function RiskBadge({
  riskLevel,
  confidence,
}: {
  riskLevel: string;
  confidence: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium capitalize text-primary-foreground">
        Risk: {riskLevel}
      </span>
      <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
        AI Confidence: {confidence.toFixed(0)}%
      </span>
    </div>
  );
}
