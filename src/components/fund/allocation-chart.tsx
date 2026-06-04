interface Allocation {
  symbol: string;
  name: string;
  weight: number;
  sector?: string;
}

export function AllocationChart({
  allocations,
  showTitle = true,
}: {
  allocations: Allocation[];
  showTitle?: boolean;
}) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Portfolio allocation
        </h3>
      )}
      <div className="space-y-3">
        {allocations.map((a) => (
          <div key={a.symbol}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">
                {a.symbol}{" "}
                <span className="text-muted font-normal">{a.name}</span>
              </span>
              <span>{(a.weight * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(a.weight * 100, 100)}%` }}
              />
            </div>
            {a.sector && (
              <p className="text-xs text-muted mt-0.5">{a.sector}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
