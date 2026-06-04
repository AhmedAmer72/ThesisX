type VoteRow = {
  agentName: string;
  stance: string;
  confidence: number;
  rationale: string;
  sourcesJson?: string;
};

export function AllocationExplanation({
  votes,
  rebalanceReason,
}: {
  votes: VoteRow[];
  rebalanceReason?: string | null;
}) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-header">
        <h2 className="font-medium text-sm tracking-wide">Why allocation changed</h2>
      </div>
      <div className="dashboard-panel-body">
      {rebalanceReason && (
        <p className="text-sm text-muted mb-4">{rebalanceReason}</p>
      )}
      <ul className="space-y-3">
        {votes.slice(0, 6).map((v) => {
          let sources: string[] = [];
          try {
            sources = JSON.parse(v.sourcesJson ?? "[]") as string[];
          } catch {
            sources = [];
          }
          return (
            <li key={v.agentName} className="text-sm border-t border-border pt-3">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{v.agentName}</span>
                <span className="text-muted capitalize">
                  {v.stance} · {v.confidence}%
                </span>
              </div>
              <p className="text-muted mt-1 line-clamp-2">{v.rationale}</p>
              {sources.length > 0 && (
                <p className="text-xs text-muted mt-1">
                  Sources: {sources.slice(0, 3).join(", ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      </div>
    </section>
  );
}
